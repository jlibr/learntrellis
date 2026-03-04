"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import type { User } from "@supabase/supabase-js";

const navItems = [
  { href: "/dashboard", label: "Dashboard", icon: GridIcon },
  { href: "/topics/new", label: "New Topic", icon: PlusIcon },
  { href: "/settings", label: "Settings", icon: GearIcon },
];

export function AppNav({ user }: { user: User }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <>
      {/* Desktop sidebar */}
      <nav className="hidden w-[240px] shrink-0 bg-[#0C0B0A] shadow-nav lg:block" aria-label="Main navigation">
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="px-5 py-7">
            <Link
              href="/dashboard"
              className="group flex items-center gap-2.5"
            >
              <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-gradient-to-b from-amber-400 to-amber-500 shadow-button-primary">
                <span className="text-sm font-bold text-[#0F0E0D]">L</span>
              </div>
              <span className="text-[15px] font-semibold text-[#EDEDEB] tracking-[-0.01em] group-hover:text-white transition-colors">
                LearnTrellis
              </span>
            </Link>
          </div>

          {/* Nav items */}
          <div className="flex-1 space-y-0.5 px-3">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "group flex items-center gap-3 rounded-[8px] px-3 py-2.5 text-[13px] font-medium transition-all duration-100",
                    isActive
                      ? "bg-white/[0.08] text-[#EDEDEB] shadow-[inset_0_1px_0_rgba(255,251,235,0.04)]"
                      : "text-[#8A8480] hover:bg-white/[0.04] hover:text-[#A8A29E]"
                  )}
                >
                  <item.icon className={cn(
                    "h-[18px] w-[18px] transition-colors",
                    isActive ? "text-amber-400" : "text-[#57534E] group-hover:text-[#8A8480]"
                  )} />
                  {item.label}
                </Link>
              );
            })}
          </div>

          {/* User section */}
          <div className="border-t border-white/[0.06] px-3 py-4">
            <div className="flex items-center gap-3 rounded-[8px] px-3 py-2">
              <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#262320] text-xs font-medium text-[#A8A29E]">
                {(user.email?.[0] || "?").toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] text-[#A8A29E]">
                  {user.email}
                </p>
              </div>
              <button
                onClick={handleLogout}
                className="shrink-0 rounded-[6px] p-1.5 text-[#57534E] hover:bg-white/[0.06] hover:text-[#A8A29E] transition-all"
                title="Sign out"
              >
                <LogOutIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile bottom tab bar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 flex items-center justify-around border-t border-white/[0.08] bg-[#0C0B0A]/95 backdrop-blur-md px-2 pb-[env(safe-area-inset-bottom)] lg:hidden" aria-label="Mobile navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-col items-center gap-1 px-3 py-3 min-h-[48px] min-w-[48px] text-[11px] font-medium transition-colors duration-100",
                isActive
                  ? "text-amber-400"
                  : "text-[#8A8480]"
              )}
            >
              <item.icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
        <button
          onClick={handleLogout}
          className="flex flex-col items-center gap-1 px-3 py-3 min-h-[48px] min-w-[48px] text-[11px] font-medium text-[#57534E] transition-colors"
        >
          <LogOutIcon className="h-5 w-5" />
          Sign out
        </button>
      </nav>
    </>
  );
}

function LogOutIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9" />
    </svg>
  );
}

function GridIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  );
}

function PlusIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
    </svg>
  );
}

function GearIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}
