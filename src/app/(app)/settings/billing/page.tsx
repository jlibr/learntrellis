import { createClient } from "@/lib/supabase/server";
import { BillingClient } from "./billing-client";

export default async function BillingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("subscription_status, stripe_customer_id, api_provider")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-semibold text-[#EDEDEB]">Billing</h1>
      <p className="mt-2 text-sm text-[#A8A29E]">
        Manage your subscription and payment methods.
      </p>

      <div className="mt-8">
        <BillingClient
          subscriptionStatus={profile?.subscription_status ?? "free"}
          hasStripeCustomer={!!profile?.stripe_customer_id}
          hasApiKey={!!profile?.api_provider}
        />
      </div>
    </div>
  );
}
