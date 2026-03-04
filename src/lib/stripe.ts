/**
 * Stripe Integration
 *
 * Handles subscription checkout and customer portal.
 * SECURITY: stripe secret key is server-only. Never expose to client.
 */

import Stripe from "stripe";

function getStripeClient(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("Server configuration error: Stripe not configured");
  }
  return new Stripe(key, {
    apiVersion: "2026-02-25.clover",
    typescript: true,
  });
}

/**
 * Create a Stripe Checkout Session for a new subscription.
 * Redirects user to Stripe-hosted checkout page.
 */
export async function createCheckoutSession(params: {
  userId: string;
  customerEmail: string;
  priceId: string;
  successUrl: string;
  cancelUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    payment_method_types: ["card"],
    customer_email: params.customerEmail,
    line_items: [
      {
        price: params.priceId,
        quantity: 1,
      },
    ],
    success_url: params.successUrl,
    cancel_url: params.cancelUrl,
    metadata: {
      userId: params.userId,
    },
    subscription_data: {
      metadata: {
        userId: params.userId,
      },
    },
  });

  if (!session.url) {
    throw new Error("Failed to create checkout session");
  }

  return session.url;
}

/**
 * Create a Stripe Customer Portal session.
 * Lets existing subscribers manage their subscription, payment methods, etc.
 */
export async function createPortalSession(params: {
  customerId: string;
  returnUrl: string;
}): Promise<string> {
  const stripe = getStripeClient();

  const session = await stripe.billingPortal.sessions.create({
    customer: params.customerId,
    return_url: params.returnUrl,
  });

  return session.url;
}

/**
 * Construct and verify a Stripe webhook event.
 * ALWAYS use this instead of parsing the body directly.
 */
export async function constructWebhookEvent(
  body: string,
  signature: string
): Promise<Stripe.Event> {
  const stripe = getStripeClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    throw new Error("Stripe webhook secret not configured");
  }

  return stripe.webhooks.constructEvent(body, signature, webhookSecret);
}

export { getStripeClient };
