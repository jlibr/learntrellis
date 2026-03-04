import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function GraduationCapIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
      <path d="M6 12v5c0 1.657 2.686 3 6 3s6-1.343 6-3v-5" />
    </svg>
  );
}

function ChartUpIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 3v18h18" />
      <path d="M18.7 8l-5.1 5.2-2.8-2.7L7 14.3" />
    </svg>
  );
}

function RepeatIcon() {
  return (
    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
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
    body: "Answer 6 questions. We map your exact starting point and skip what you already know.",
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
      {/* Hero */}
      <section
        className="relative px-6 pt-[120px] pb-[80px] max-md:pt-[80px] max-md:pb-[60px]"
        style={{
          backgroundImage:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(245,158,11,0.08), transparent)",
        }}
      >
        <div className="mx-auto max-w-[1200px] text-center">
          <p className="text-[13px] font-semibold uppercase tracking-[0.08em] text-[#F59E0B] mb-4">
            AI-Powered Adaptive Learning
          </p>
          <h1 className="mx-auto max-w-[640px] text-[48px] max-md:text-[32px] font-extrabold leading-[1.15] tracking-[-0.03em] text-[#EDEDEB]">
            Learn anything. Master it completely.
          </h1>
          <p className="mx-auto mt-5 max-w-[520px] text-[19px] max-md:text-[17px] font-normal leading-[1.6] text-[#A8A29E]">
            Adaptive lessons, spaced repetition, and real mastery checks —
            personalized to exactly where you are.
          </p>
          <div className="mt-10 flex items-center justify-center gap-3 max-md:flex-col max-md:gap-3">
            <Link
              href="/signup"
              className="inline-flex h-12 items-center justify-center rounded-[8px] bg-[#F59E0B] px-8 text-[15px] font-semibold text-[#0F0E0D] transition-all duration-150 hover:bg-[#FBBF24] max-md:w-full"
            >
              Start Learning Free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-12 items-center justify-center rounded-[8px] border border-white/[0.12] bg-transparent px-8 text-[15px] font-semibold text-[#EDEDEB] transition-all duration-150 hover:bg-white/[0.06] max-md:w-full"
            >
              Sign In
            </Link>
          </div>
          <p className="mt-8 text-[13px] text-[#8A8480]">
            No credit card required &bull; Cancel anytime
          </p>
        </div>
      </section>

      {/* Feature Cards */}
      <section className="px-6 py-[80px]">
        <div className="mx-auto grid max-w-[960px] grid-cols-1 gap-6 md:grid-cols-3">
          {features.map((f) => (
            <div
              key={f.title}
              className="rounded-[12px] border border-white/[0.08] bg-[#161513] p-8 transition-all duration-150 hover:border-[rgba(245,158,11,0.25)]"
            >
              <div className="mb-4">{f.icon}</div>
              <h3 className="text-[17px] font-semibold text-[#EDEDEB]">
                {f.title}
              </h3>
              <p className="mt-2 text-[15px] leading-[1.6] text-[#A8A29E]">
                {f.body}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className="px-6 pb-[80px]">
        <div className="mx-auto max-w-[800px] rounded-[16px] border border-[rgba(245,158,11,0.15)] bg-[rgba(245,158,11,0.08)] p-12 max-md:p-8 text-center">
          <h2 className="text-[30px] max-md:text-[24px] font-bold text-[#EDEDEB]">
            Ready to learn something new?
          </h2>
          <p className="mt-3 text-[17px] text-[#A8A29E]">
            Join and build your first personalized curriculum in under 5
            minutes.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-12 items-center justify-center rounded-[8px] bg-[#F59E0B] px-8 text-[15px] font-semibold text-[#0F0E0D] transition-all duration-150 hover:bg-[#FBBF24]"
          >
            Get Started Free
          </Link>
        </div>
      </section>
    </div>
  );
}
