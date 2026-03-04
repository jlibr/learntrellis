/**
 * Stripe Webhook Handler
 *
 * Handles subscription lifecycle events from Stripe.
 * SECURITY: Always verifies webhook signature before processing.
 */

import { NextRequest, NextResponse } from "next/server";
import { constructWebhookEvent } from "@/lib/stripe";
import { createClient } from "@supabase/supabase-js";
import type Stripe from "stripe";

// Use service-role client for webhook operations (no user session)
function getAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin client not configured");
  }

  return createClient(url, serviceKey);
}

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json(
      { error: "Missing stripe-signature header" },
      { status: 400 }
    );
  }

  let event: Stripe.Event;

  try {
    event = await constructWebhookEvent(body, signature);
  } catch (err) {
    console.error(
      "Webhook signature verification failed:",
      err instanceof Error ? err.message : "Unknown error"
    );
    return NextResponse.json(
      { error: "Invalid signature" },
      { status: 400 }
    );
  }

  const supabase = getAdminClient();

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.userId;
        const customerId =
          typeof session.customer === "string"
            ? session.customer
            : session.customer?.id;

        if (!userId) {
          console.error("checkout.session.completed: missing userId in metadata");
          break;
        }

        const { error } = await supabase
          .from("profiles")
          .update({
            subscription_status: "active",
            stripe_customer_id: customerId || null,
          })
          .eq("id", userId);

        if (error) {
          console.error("Failed to update profile after checkout:", error.message);
        }

        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) break;

        const status = mapStripeStatus(subscription.status);

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: status })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Failed to update subscription status:", error.message);
        }

        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId =
          typeof subscription.customer === "string"
            ? subscription.customer
            : subscription.customer?.id;

        if (!customerId) break;

        const { error } = await supabase
          .from("profiles")
          .update({ subscription_status: "canceled" })
          .eq("stripe_customer_id", customerId);

        if (error) {
          console.error("Failed to mark subscription canceled:", error.message);
        }

        break;
      }

      default:
        // Unhandled event type — acknowledge without processing
        break;
    }
  } catch (err) {
    console.error("Webhook processing error:", err);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }

  return NextResponse.json({ received: true });
}

/**
 * Map Stripe subscription status to our simplified status field.
 */
function mapStripeStatus(
  stripeStatus: Stripe.Subscription.Status
): string {
  switch (stripeStatus) {
    case "active":
    case "trialing":
      return "active";
    case "canceled":
    case "unpaid":
    case "incomplete_expired":
      return "canceled";
    case "past_due":
    case "incomplete":
      return "active"; // Still allow access during grace period
    case "paused":
      return "canceled";
    default:
      return "free";
  }
}
