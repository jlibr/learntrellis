"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { startCheckout, openPortal } from "./actions";

type Props = {
  subscriptionStatus: string;
  hasStripeCustomer: boolean;
  hasApiKey: boolean;
};

export function BillingClient({
  subscriptionStatus,
  hasStripeCustomer,
  hasApiKey,
}: Props) {
  const searchParams = useSearchParams();
  const success = searchParams.get("success");
  const canceled = searchParams.get("canceled");

  const [loading, setLoading] = useState<"checkout" | "portal" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isActive = subscriptionStatus === "active";

  async function handleCheckout() {
    setLoading("checkout");
    setError(null);

    const result = await startCheckout();
    if (result.success) {
      window.location.href = result.data;
    } else {
      setError(result.error);
      setLoading(null);
    }
  }

  async function handlePortal() {
    setLoading("portal");
    setError(null);

    const result = await openPortal();
    if (result.success) {
      window.location.href = result.data;
    } else {
      setError(result.error);
      setLoading(null);
    }
  }

  return (
    <div className="space-y-6">
      {/* Success/Cancel Banners */}
      {success && (
        <div className="rounded-md bg-green-900/20 border border-green-500/20 px-4 py-3 text-sm text-green-400">
          Subscription activated. You now have access to hosted AI.
        </div>
      )}
      {canceled && (
        <div className="rounded-[8px] bg-[#262320] border border-white/[0.12] px-4 py-3 text-sm text-[#A8A29E]">
          Checkout was canceled. No charges were made.
        </div>
      )}

      {/* Current Plan */}
      <Card>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-medium text-[#EDEDEB]">Current Plan</h2>
            <div className="mt-2 flex items-center gap-3">
              <Badge variant={isActive ? "success" : "default"}>
                {isActive ? "Pro" : "Free"}
              </Badge>
              {hasApiKey && !isActive && (
                <span className="text-xs text-[#8A8480]">Using your own API key</span>
              )}
            </div>
          </div>
        </div>

        {isActive ? (
          <div className="mt-6">
            <p className="text-sm text-[#A8A29E]">
              Your subscription is active. AI calls use hosted infrastructure at
              no additional cost per request.
            </p>
            <div className="mt-4">
              <Button
                onClick={handlePortal}
                variant="secondary"
                size="sm"
                disabled={loading !== null}
              >
                {loading === "portal" ? "Opening..." : "Manage Subscription"}
              </Button>
            </div>
          </div>
        ) : (
          <div className="mt-6">
            <div className="rounded-[8px] bg-[#262320]/50 border border-white/[0.12] p-4">
              <h3 className="text-sm font-medium text-[#EDEDEB]">
                Pro Plan
              </h3>
              <p className="mt-1 text-sm text-[#A8A29E]">
                Hosted AI access — no API key needed. Unlimited lessons,
                assessments, and reviews.
              </p>
              <ul className="mt-3 space-y-2 text-sm text-[#A8A29E]">
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  No API key required
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  All AI features included
                </li>
                <li className="flex items-center gap-2">
                  <CheckIcon />
                  Priority model access
                </li>
              </ul>
              <div className="mt-4">
                <Button
                  onClick={handleCheckout}
                  size="sm"
                  disabled={loading !== null}
                >
                  {loading === "checkout" ? "Redirecting..." : "Subscribe"}
                </Button>
              </div>
            </div>

            {!hasApiKey && (
              <p className="mt-4 text-xs text-[#8A8480]">
                Or{" "}
                <a
                  href="/settings"
                  className="text-amber-500 hover:text-amber-400"
                >
                  bring your own API key
                </a>{" "}
                to use LearnTrellis for free.
              </p>
            )}
          </div>
        )}

        {/* Existing customer who canceled */}
        {subscriptionStatus === "canceled" && hasStripeCustomer && (
          <div className="mt-4 rounded-md bg-amber-500/10 border border-amber-500/20 px-4 py-3">
            <p className="text-sm text-amber-400">
              Your subscription has been canceled.{" "}
              <button
                onClick={handlePortal}
                className="underline hover:no-underline"
              >
                Resubscribe via billing portal
              </button>
            </p>
          </div>
        )}
      </Card>

      {/* Error */}
      {error && (
        <div className="rounded-md bg-red-900/20 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      className="h-4 w-4 text-amber-500 flex-shrink-0"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M4.5 12.75l6 6 9-13.5"
      />
    </svg>
  );
}
