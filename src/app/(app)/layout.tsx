import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { AppNav } from "@/components/ui/app-nav";

export const dynamic = "force-dynamic";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#0a0a0c]">
      <AppNav user={user} />
      <main className="flex-1 min-w-0 overflow-y-auto">
        <div className="mx-auto max-w-[960px] px-6 py-8 pb-24 lg:pb-8">
          {children}
        </div>
      </main>
    </div>
  );
}
