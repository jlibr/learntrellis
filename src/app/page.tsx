import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function GraduationCapIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
    </svg>
  );
}

function ChartUpIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 1l4 4-4 4" />
      <path d="M3 11V9a4 4 0 014-4h14" />
      <path d="M7 23l-4-4 4-4" />
      <path d="M21 13v2a4 4 0 01-4 4H3" />
    </svg>
  );
}

const features = [
  {
    icon: <GraduationCapIcon />,
    title: "Personalized baseline",
    body: "Answer a few questions. We map your exact starting point and skip what you already know.",
  },
  {
    icon: <ChartUpIcon />,
    title: "Adaptive curriculum",
    body: "AI builds a sequence of modules matched to Bloom\u2019s taxonomy for your specific goal.",
  },
  {
    icon: <RepeatIcon />,
    title: "Spaced repetition",
    body: "Concepts resurface at scientifically optimal intervals. You retain what you learn.",
  },
];

export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0F0E0D]">
      {/* Nav */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0F0E0D]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-gradient-to-b from-amber-400 to-amber-500 shadow-button-primary">
              <span className="text-sm font-bold text-[#0F0E0D]">L</span>
            </div>
            <span className="text-[15px] font-semibold text-[#EDEDEB] tracking-[-0.01em]">
              LearnTrellis
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#A8A29E] hover:text-[#EDEDEB] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-[6px] bg-gradient-to-b from-amber-400 to-amber-500 px-4 text-[13px] font-semibold text-[#0F0E0D] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative px-6 pt-[160px] pb-[100px] max-md:pt-[120px] max-md:pb-[72px]">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 70% 50% at 50% 0%, rgba(245,158,11,0.07), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/20 bg-amber-500/[0.06] px-4 py-1.5 mb-6">
            <div className="h-1.5 w-1.5 rounded-full bg-amber-400 animate-pulse" />
            <span className="text-[12px] font-semibold uppercase tracking-[0.06em] text-amber-400/90">
              AI-Powered Adaptive Learning
            </span>
          </div>
          <h1 className="mx-auto max-w-[680px] text-[52px] max-md:text-[36px] font-extrabold leading-[1.1] tracking-[-0.035em] text-[#EDEDEB]">
            Learn anything.{" "}
            <span className="bg-gradient-to-r from-amber-300 to-amber-500 bg-clip-text text-transparent">
              Master it completely.
            </span>
          </h1>
          <p className="mx-auto mt-6 max-w-[520px] text-[18px] max-md:text-[16px] font-normal leading-[1.65] text-[#A8A29E]">
            Adaptive lessons, spaced repetition, and real mastery checks —
            personalized to exactly where you are.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 max-md:flex-col max-md:gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-[10px] bg-gradient-to-b from-amber-400 to-amber-500 px-8 text-[15px] font-semibold text-[#0F0E0D] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover hover:-translate-y-0.5 active:translate-y-0 max-md:w-full"
            >
              Start Learning Free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[10px] border border-white/[0.12] bg-white/[0.03] px-8 text-[15px] font-medium text-[#EDEDEB] transition-all duration-150 hover:bg-white/[0.07] hover:border-white/[0.18] max-md:w-full"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-8 text-[13px] text-[#57534E]">
            No credit card required &bull; Cancel anytime
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 py-[80px]">
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-5 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="group rounded-[12px] border border-white/[0.08] bg-gradient-to-b from-[#1A1816] to-[#141210] p-8 shadow-card transition-all duration-200 hover:border-amber-500/20 hover:shadow-card-hover hover:-translate-y-0.5"
            >
              <div className="mb-5 flex h-10 w-10 items-center justify-center rounded-[8px] bg-amber-500/[0.08] text-amber-400 transition-colors group-hover:bg-amber-500/[0.12]">
                {f.icon}
              </div>
              <h3 className="text-[16px] font-semibold text-[#EDEDEB] tracking-[-0.01em]">
                {f.title}
              </h3>
              <p className="mt-2.5 text-[14px] leading-[1.65] text-[#A8A29E]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 pb-[100px]">
        <div className="relative mx-auto max-w-[800px] overflow-hidden rounded-[16px] border border-amber-500/15 bg-gradient-to-b from-amber-500/[0.06] to-transparent p-12 max-md:p-8 text-center">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              backgroundImage:
                "radial-gradient(ellipse 60% 80% at 50% 0%, rgba(245,158,11,0.06), transparent 70%)",
            }}
          />
          <div className="relative">
            <h2 className="text-[28px] max-md:text-[22px] font-bold text-[#EDEDEB] tracking-[-0.02em]">
              Ready to learn something new?
            </h2>
            <p className="mt-3 text-[16px] text-[#A8A29E]">
              Build your first personalized curriculum in under 5 minutes.
            </p>
            <Link
              href="/signup"
              className="mt-8 inline-flex h-12 items-center justify-center rounded-[10px] bg-gradient-to-b from-amber-400 to-amber-500 px-8 text-[15px] font-semibold text-[#0F0E0D] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover hover:-translate-y-0.5"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/[0.06] px-6 py-8">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between text-[13px] text-[#57534E]">
          <span>&copy; 2026 LearnTrellis</span>
          <div className="flex gap-6">
            <Link href="/login" className="hover:text-[#8A8480] transition-colors">Sign in</Link>
            <Link href="/signup" className="hover:text-[#8A8480] transition-colors">Get started</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
