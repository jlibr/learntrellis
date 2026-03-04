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
      <h1 className="text-2xl font-bold text-[#EDEDEB] tracking-[-0.025em] animate-in">Settings</h1>

      <div className="mt-8 space-y-8 animate-in-delay-1">
        {/* Profile Section */}
        <section>
          <h2 className="text-lg font-medium text-[#EDEDEB]">Profile</h2>
          <div className="mt-4 rounded-[12px] border border-white/[0.08] bg-gradient-to-b from-[#1A1816] to-[#161513] p-6 shadow-card">
            <dl className="space-y-4">
              <div>
                <dt className="text-sm text-[#8A8480]">Email</dt>
                <dd className="mt-1 text-sm text-[#EDEDEB]">{user!.email}</dd>
              </div>
              <div>
                <dt className="text-sm text-[#8A8480]">Display Name</dt>
                <dd className="mt-1 text-sm text-[#EDEDEB]">
                  {profile?.display_name || "Not set"}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-[#8A8480]">Timezone</dt>
                <dd className="mt-1 text-sm text-[#EDEDEB]">
                  {profile?.timezone || "UTC"}
                </dd>
              </div>
            </dl>
          </div>
        </section>

        {/* API Provider Section */}
        <section>
          <h2 className="text-lg font-medium text-[#EDEDEB]">API Provider</h2>
          <p className="mt-1 text-sm text-[#8A8480]">
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
          <h2 className="text-lg font-medium text-[#EDEDEB]">Subscription</h2>
          <div className="mt-4 rounded-[12px] border border-white/[0.08] bg-gradient-to-b from-[#1A1816] to-[#161513] p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-[#A8A29E]">
                  Status:{" "}
                  <span className="font-medium text-[#EDEDEB]">
                    {profile?.subscription_status === "active"
                      ? "Active"
                      : profile?.subscription_status === "canceled"
                        ? "Canceled"
                        : "Free"}
                  </span>
                </p>
                {profile?.subscription_status !== "active" && !profile?.api_provider && (
                  <p className="mt-2 text-xs text-[#8A8480]">
                    Add an API key above or subscribe for hosted access.
                  </p>
                )}
              </div>
              <a
                href="/settings/billing"
                className="text-sm text-amber-500 hover:text-amber-400 transition-colors"
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
