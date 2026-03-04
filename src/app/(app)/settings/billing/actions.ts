"use server";

import { createClient } from "@/lib/supabase/server";
import { createCheckoutSession, createPortalSession } from "@/lib/stripe";
import { headers } from "next/headers";

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

/**
 * Create a Stripe Checkout Session and return the URL to redirect to.
 */
export async function startCheckout(): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const priceId = process.env.STRIPE_PRICE_ID;
    if (!priceId) {
      console.error("STRIPE_PRICE_ID not configured");
      return { success: false, error: "Billing not configured. Please contact support." };
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const url = await createCheckoutSession({
      userId: user.id,
      customerEmail: user.email || "",
      priceId,
      successUrl: `${origin}/settings/billing?success=true`,
      cancelUrl: `${origin}/settings/billing?canceled=true`,
    });

    return { success: true, data: url };
  } catch (err) {
    console.error("startCheckout error:", err);
    return { success: false, error: "Could not start checkout. Please try again." };
  }
}

/**
 * Create a Stripe Customer Portal session and return the URL.
 */
export async function openPortal(): Promise<ActionResult<string>> {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return { success: false, error: "Not authenticated." };
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

    if (!profile?.stripe_customer_id) {
      return { success: false, error: "No active subscription found." };
    }

    const headersList = await headers();
    const origin = headersList.get("origin") || "http://localhost:3000";

    const url = await createPortalSession({
      customerId: profile.stripe_customer_id,
      returnUrl: `${origin}/settings/billing`,
    });

    return { success: true, data: url };
  } catch (err) {
    console.error("openPortal error:", err);
    return { success: false, error: "Could not open billing portal. Please try again." };
  }
}
