"use server";

import { createClient } from "@/lib/supabase/server";

// Common disposable email domains that bots use
const DISPOSABLE_DOMAINS = new Set([
  "mailinator.com", "guerrillamail.com", "tempmail.com", "throwaway.email",
  "yopmail.com", "sharklasers.com", "guerrillamailblock.com", "grr.la",
  "dispostable.com", "trashmail.com", "maildrop.cc", "fakeinbox.com",
  "tempail.com", "10minutemail.com", "temp-mail.org", "emailondeck.com",
  "getnada.com", "mohmal.com", "mailnesia.com", "mailcatch.com",
  "mintemail.com", "tempmailaddress.com", "burnermail.io",
]);

// Strict email regex - matches 99.9% of valid emails, rejects garbage
const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*\.[a-zA-Z]{2,}$/;

// Simple in-memory rate limit (per serverless function instance)
const signupAttempts = new Map<string, { count: number; resetAt: number }>();
const RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000; // 1 hour
const MAX_SIGNUPS_PER_WINDOW = 5;

function isRateLimited(ip: string): boolean {
  const now = Date.now();
  const entry = signupAttempts.get(ip);

  if (!entry || now > entry.resetAt) {
    signupAttempts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return false;
  }

  entry.count++;
  return entry.count > MAX_SIGNUPS_PER_WINDOW;
}

export async function signupWithEmail(
  email: string,
  password: string,
  displayName?: string
): Promise<{ success: boolean; error?: string }> {
  // 1. Validate email format
  const trimmedEmail = email.trim().toLowerCase();

  if (!EMAIL_REGEX.test(trimmedEmail)) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // 2. Block disposable email domains
  const domain = trimmedEmail.split("@")[1];
  if (DISPOSABLE_DOMAINS.has(domain)) {
    return { success: false, error: "Please use a permanent email address." };
  }

  // 3. Require TLD to have at least 2 chars and domain to have at least 3 chars
  const domainParts = domain.split(".");
  if (domainParts.length < 2 || domainParts[0].length < 2) {
    return { success: false, error: "Please enter a valid email address." };
  }

  // 4. Password validation
  if (password.length < 8) {
    return { success: false, error: "Password must be at least 8 characters." };
  }

  // 5. Rate limit (best-effort, resets per serverless instance)
  // Using a generic key since we can't reliably get IP in all Next.js deployments
  const rateLimitKey = trimmedEmail;
  if (isRateLimited(rateLimitKey)) {
    return { success: false, error: "Too many signup attempts. Please try again later." };
  }

  // 6. Call Supabase signup
  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: trimmedEmail,
    password,
    options: {
      data: {
        full_name: displayName?.trim() || undefined,
      },
    },
  });

  if (error) {
    console.error("Signup error:", error.message);
    return { success: false, error: error.message };
  }

  return { success: true };
}
