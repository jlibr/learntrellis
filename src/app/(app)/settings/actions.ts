"use server";

import { createClient } from "@/lib/supabase/server";
import { encrypt, decrypt } from "@/lib/crypto";
import {
  chatCompletion,
  buildProviderConfig,
  ProviderError,
  type ProviderName,
} from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

type ProviderConfigResult = {
  provider: ProviderName | "hosted";
  baseUrl: string;
  apiKey: string;
  model: string;
} | null;

// ---------------------------------------------------------------------------
// Save API Key
// ---------------------------------------------------------------------------

/**
 * Encrypt and store the user's API key for the given provider.
 * Validates provider name, encrypts key, and writes to profiles table.
 */
export async function saveApiKey(
  provider: string,
  apiKey: string
): Promise<ActionResult> {
  try {
    if (provider !== "openrouter" && provider !== "venice") {
      return { success: false, error: "Invalid provider. Choose OpenRouter or Venice." };
    }

    if (!apiKey || apiKey.trim().length < 10) {
      return { success: false, error: "API key appears invalid." };
    }

    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const encryptedKey = await encrypt(apiKey.trim());

    const { error } = await supabase
      .from("profiles")
      .update({
        api_provider: provider,
        encrypted_api_key: encryptedKey,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to save API key:", error.message);
      return { success: false, error: "Failed to save key. Please try again." };
    }

    return { success: true, data: null };
  } catch (err) {
    console.error("saveApiKey error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// Test API Key
// ---------------------------------------------------------------------------

/**
 * Test an API key by making a minimal completion request.
 * Does NOT save the key — that happens separately after a successful test.
 */
export async function testApiKey(
  provider: string,
  apiKey: string
): Promise<ActionResult> {
  try {
    if (provider !== "openrouter" && provider !== "venice") {
      return { success: false, error: "Invalid provider." };
    }

    if (!apiKey || apiKey.trim().length < 10) {
      return { success: false, error: "API key appears invalid." };
    }

    const config = buildProviderConfig(
      provider as ProviderName,
      apiKey.trim(),
      // Use a cheap model for the test call
      provider === "openrouter"
        ? "anthropic/claude-3.5-haiku"
        : "anthropic/claude-3.5-haiku"
    );

    await chatCompletion(
      config,
      [{ role: "user", content: "Say 'ok' and nothing else." }],
      { maxTokens: 5, temperature: 0 }
    );

    return { success: true, data: null };
  } catch (err) {
    if (err instanceof ProviderError) {
      if (err.code === "INVALID_KEY") {
        return { success: false, error: "Invalid API key. Please check and try again." };
      }
      return { success: false, error: err.message };
    }
    console.error("testApiKey error:", err);
    return { success: false, error: "Could not verify key. Please try again." };
  }
}

// ---------------------------------------------------------------------------
// Remove API Key
// ---------------------------------------------------------------------------

/**
 * Delete the user's stored API key and reset provider to null.
 */
export async function removeApiKey(): Promise<ActionResult> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const { error } = await supabase
      .from("profiles")
      .update({
        api_provider: null,
        encrypted_api_key: null,
      })
      .eq("id", user.id);

    if (error) {
      console.error("Failed to remove API key:", error.message);
      return { success: false, error: "Failed to remove key. Please try again." };
    }

    return { success: true, data: null };
  } catch (err) {
    console.error("removeApiKey error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// Get Provider Config
// ---------------------------------------------------------------------------

/**
 * Build a ProviderConfig for the current user.
 *
 * Logic:
 * 1. If user has a BYOK key → decrypt it and return their provider config.
 * 2. If user has an active subscription and no BYOK → use the hosted key.
 * 3. Otherwise → return null (user needs to configure a key or subscribe).
 */
export async function getProviderConfig(
  model: string
): Promise<ActionResult<ProviderConfigResult>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile, error } = await supabase
      .from("profiles")
      .select("api_provider, encrypted_api_key, subscription_status")
      .eq("id", user.id)
      .single();

    if (error || !profile) {
      console.error("Failed to fetch profile:", error?.message);
      return { success: false, error: "Could not load provider config." };
    }

    // Case 1: User has their own key (BYOK)
    if (profile.api_provider && profile.encrypted_api_key) {
      const apiKey = await decrypt(profile.encrypted_api_key);
      const provider = profile.api_provider as ProviderName;
      const config = buildProviderConfig(provider, apiKey, model);

      return {
        success: true,
        data: {
          provider,
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        },
      };
    }

    // Case 2: No BYOK key → use hosted key (subscribers only)
    if (profile.subscription_status !== "active" && profile.subscription_status !== "trialing") {
      return {
        success: true,
        data: null,
      };
    }

    const hostedKey = process.env.HOSTED_API_KEY?.trim();
    const hostedProvider = (process.env.HOSTED_PROVIDER?.trim() || "openrouter") as ProviderName;

    if (hostedKey) {
      const config = buildProviderConfig(hostedProvider, hostedKey, model);

      return {
        success: true,
        data: {
          provider: "hosted",
          baseUrl: config.baseUrl,
          apiKey: config.apiKey,
          model: config.model,
        },
      };
    }

    // Case 3: No BYOK key and no hosted key available
    return {
      success: true,
      data: null,
    };
  } catch (err) {
    console.error("getProviderConfig error:", err);
    return { success: false, error: "Something went wrong." };
  }
}
