import { createClient } from "@/lib/supabase/server";
import { ProviderSettings } from "./provider-settings";

export default async function SettingsPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone, api_provider, subscription_status")
    .eq("id", user!.id)
    .single();

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-[28px] font-semibold text-[#eeeeef] tracking-[-0.025em] animate-in">Settings</h1>

      <div className="mt-8 space-y-8 animate-in-delay-1">
        {/* Profile Section */}
        <section>
          <h2 className="text-[17px] font-medium text-[#eeeeef] tracking-[-0.02em]">Profile</h2>
          <div className="mt-4 rounded-[14px] border border-white/[0.07] bg-[#111113] p-6">
            <dl className="space-y-4">
              <div>
                <dt className="text-[13px] text-[#6e6e78]">Email</dt>
                <dd className="mt-1 text-[14px] text-[#eeeeef]">{user!.email}</dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#6e6e78]">Display Name</dt>
                <dd className="mt-1 text-[14px] text-[#eeeeef]">
                  {profile?.display_name || "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-[13px] text-[#6e6e78]">Timezone</dt>
                <dd className="mt-1 text-[14px] text-[#eeeeef]">
                  {profile?.timezone || "UTC"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* API Provider Section */}
        <section>
          <h2 className="text-[17px] font-medium text-[#eeeeef] tracking-[-0.02em]">API Provider</h2>
          <p className="mt-1 text-[13px] text-[#6e6e78]">
            Connect your own API key to use LearnTrellis, or subscribe for hosted access.
          </p>
          <div className="mt-4">
            <ProviderSettings
              currentProvider={profile?.api_provider ?? null}
              hasKey={!!profile?.api_provider}
              subscriptionStatus={profile?.subscription_status ?? "free"}
            />
          </div>
        </section>

        {/* Subscription Section */}
        <section>
          <h2 className="text-[17px] font-medium text-[#eeeeef] tracking-[-0.02em]">Subscription</h2>
          <div className="mt-4 rounded-[14px] border border-white/[0.07] bg-[#111113] p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[14px] text-[#a8a8b0]">
                  Status:{" "}
                  <span className="font-medium text-[#eeeeef]">
                    {profile?.subscription_status === "active"
                      ? "Active"
                      : profile?.subscription_status === "canceled"
                        ? "Canceled"
                        : "Free"}
                  </span>
                </p>
                {profile?.subscription_status !== "active" && !profile?.api_provider && (
                  <p className="mt-2 text-[12px] text-[#6e6e78]">
                    Add an API key above or subscribe for hosted access.
                  </p>
                )}
              </div>
              <a
                href="/settings/billing"
                className="text-[13px] text-amber-400 hover:text-amber-300 transition-colors"
              >
                Manage billing
              </a>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
