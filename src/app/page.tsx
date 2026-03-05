import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { Reveal } from "@/components/reveal";

/* ─── Product Mockup ─── */
function ProductMockup() {
  return (
    <div className="relative mx-auto max-w-[800px]" style={{ boxShadow: "0 8px 60px rgba(0,0,0,0.4), 0 2px 20px rgba(0,0,0,0.3)" }}>
      {/* Browser chrome */}
      <div className="rounded-t-[12px] border border-white/[0.07] border-b-0 bg-[#111113] px-4 py-3 flex items-center gap-2">
        <div className="flex gap-1.5">
          <div className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
          <div className="h-2.5 w-2.5 rounded-full bg-white/[0.08]" />
        </div>
        <div className="flex-1 flex justify-center">
          <div className="rounded-[6px] bg-white/[0.04] px-4 py-1 text-[11px] text-[#45454d]">
            learntrellis.com/dashboard
          </div>
        </div>
      </div>
      {/* App UI mock */}
      <div className="rounded-b-[12px] border border-white/[0.07] bg-[#0a0a0c] overflow-hidden">
        <div className="flex min-h-[380px]">
          {/* Sidebar mock */}
          <div className="w-[180px] shrink-0 border-r border-white/[0.06] bg-[#08080a] p-4 hidden sm:block">
            <div className="flex items-center gap-2 mb-8">
              <div className="h-6 w-6 rounded-[5px] bg-gradient-to-b from-amber-400 to-amber-500 flex items-center justify-center">
                <span className="text-[10px] font-bold text-[#0a0a0c]">L</span>
              </div>
              <span className="text-[12px] font-semibold text-[#eeeeef]">LearnTrellis</span>
            </div>
            <div className="space-y-1">
              <div className="rounded-[6px] bg-white/[0.06] px-2.5 py-2 text-[11px] font-medium text-[#eeeeef]">Dashboard</div>
              <div className="rounded-[6px] px-2.5 py-2 text-[11px] text-[#6e6e78]">New Topic</div>
              <div className="rounded-[6px] px-2.5 py-2 text-[11px] text-[#6e6e78]">Settings</div>
            </div>
          </div>
          {/* Main content mock */}
          <div className="flex-1 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="text-[14px] font-semibold text-[#eeeeef] tracking-[-0.02em]">Your Topics</div>
              <div className="rounded-[6px] bg-gradient-to-b from-amber-400 to-amber-500 px-3 py-1.5 text-[10px] font-semibold text-[#0a0a0c]">New Topic</div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Topic card 1 */}
              <div className="rounded-[10px] border border-white/[0.07] bg-[#111113] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-medium text-[#eeeeef]">Machine Learning</span>
                  <span className="rounded-full bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 text-[9px] font-medium text-blue-300">Active</span>
                </div>
                <div className="text-[10px] text-[#6e6e78] mb-3">Module 3: Neural Networks</div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                  <div className="h-full w-[65%] rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[9px] text-amber-400">3 reviews due</span>
                  <span className="text-[10px] text-amber-400">Continue →</span>
                </div>
              </div>
              {/* Topic card 2 */}
              <div className="rounded-[10px] border border-white/[0.07] bg-[#111113] p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[12px] font-medium text-[#eeeeef]">Spanish B1</span>
                  <span className="rounded-full bg-blue-400/10 border border-blue-400/20 px-2 py-0.5 text-[9px] font-medium text-blue-300">Active</span>
                </div>
                <div className="text-[10px] text-[#6e6e78] mb-3">Module 5: Subjunctive Mood</div>
                <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-3">
                  <div className="h-full w-[42%] rounded-full bg-gradient-to-r from-amber-500 to-amber-400" />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-[#6e6e78]">8/19 lessons</span>
                  <span className="text-[10px] text-amber-400">Continue →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── Feature Section ─── */
function FeatureSection({
  eyebrow,
  title,
  titleGray,
  description,
  visual,
  reverse = false,
}: {
  eyebrow: string;
  title: string;
  titleGray?: string;
  description: string;
  visual: React.ReactNode;
  reverse?: boolean;
}) {
  return (
    <div className={`flex flex-col ${reverse ? "lg:flex-row-reverse" : "lg:flex-row"} items-center gap-12 lg:gap-20`}>
      <div className="flex-1 max-w-[480px]">
        <span className="text-[12px] font-semibold uppercase tracking-[0.08em] text-amber-400/80 mb-3 block">
          {eyebrow}
        </span>
        <h2 className="text-[32px] font-semibold leading-[1.1] tracking-[-0.025em] text-[#eeeeef]">
          {title}{titleGray && <>{" "}<span className="text-[#6e6e78]">{titleGray}</span></>}
        </h2>
        <p className="mt-4 text-[16px] leading-[1.65] text-[#a8a8b0]">
          {description}
        </p>
      </div>
      <div className="flex-1 w-full max-w-[440px]">
        {visual}
      </div>
    </div>
  );
}

/* ─── Feature Visuals (HTML mocks) ─── */
function AssessmentVisual() {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-[#111113] p-5 space-y-4" style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.25)" }}>
      <div className="text-[13px] font-medium text-[#eeeeef] mb-1">Baseline Assessment</div>
      <div className="text-[12px] text-[#a8a8b0] leading-[1.6]">
        What is the primary purpose of a loss function in machine learning?
      </div>
      <div className="space-y-2">
        {["Minimize prediction error", "Maximize training speed", "Reduce dataset size", "Normalize input features"].map((opt, i) => (
          <div
            key={opt}
            className={`rounded-[8px] border px-3.5 py-2.5 text-[12px] transition-colors ${
              i === 0
                ? "border-amber-500/40 bg-amber-500/[0.06] text-amber-400"
                : "border-white/[0.07] text-[#a8a8b0] hover:border-white/[0.12]"
            }`}
          >
            {opt}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between pt-2">
        <span className="text-[11px] text-[#45454d]">Question 3 of 12</span>
        <div className="h-1 w-24 rounded-full bg-white/[0.06] overflow-hidden">
          <div className="h-full w-[25%] rounded-full bg-amber-500" />
        </div>
      </div>
    </div>
  );
}

function CurriculumVisual() {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-[#111113] p-5" style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.25)" }}>
      <div className="text-[13px] font-medium text-[#eeeeef] mb-4">Your Curriculum</div>
      <div className="space-y-2.5">
        {[
          { title: "1. Linear Algebra Foundations", status: "completed", color: "green" },
          { title: "2. Probability & Statistics", status: "completed", color: "green" },
          { title: "3. Neural Networks", status: "active", color: "amber" },
          { title: "4. Backpropagation", status: "locked", color: "gray" },
          { title: "5. Convolutional Networks", status: "locked", color: "gray" },
        ].map((mod) => (
          <div key={mod.title} className="flex items-center gap-3">
            <div className={`h-5 w-5 rounded-full flex items-center justify-center shrink-0 ${
              mod.color === "green" ? "bg-green-500/15 text-green-400" :
              mod.color === "amber" ? "bg-amber-500/15 text-amber-400 pulse-soft" :
              "bg-white/[0.04] text-[#45454d]"
            }`}>
              {mod.color === "green" ? (
                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path d="M20 6L9 17l-5-5"/></svg>
              ) : mod.color === "amber" ? (
                <div className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              ) : (
                <svg width="8" height="8" viewBox="0 0 24 24" fill="currentColor"><path d="M18 8h-1V6c0-2.76-2.24-5-5-5S7 3.24 7 6v2H6c-1.1 0-2 .9-2 2v10c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V10c0-1.1-.9-2-2-2z"/></svg>
              )}
            </div>
            <span className={`text-[12px] ${
              mod.color === "gray" ? "text-[#45454d]" : "text-[#a8a8b0]"
            }`}>{mod.title}</span>
            {mod.status === "active" && (
              <span className="ml-auto text-[9px] font-medium text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded-full">In Progress</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function RetentionVisual() {
  return (
    <div className="rounded-[12px] border border-white/[0.07] bg-[#111113] p-5" style={{ boxShadow: "0 4px 30px rgba(0,0,0,0.25)" }}>
      <div className="text-[13px] font-medium text-[#eeeeef] mb-4">Spaced Repetition</div>
      <div className="space-y-3">
        {[
          { concept: "Gradient Descent", interval: "Review in 4 days", strength: 85 },
          { concept: "Activation Functions", interval: "Review in 1 day", strength: 62 },
          { concept: "Batch Normalization", interval: "Review today", strength: 35 },
        ].map((card) => (
          <div key={card.concept} className="rounded-[8px] border border-white/[0.07] bg-[#0a0a0c] p-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[12px] font-medium text-[#eeeeef]">{card.concept}</span>
              <span className={`text-[10px] ${card.strength > 70 ? "text-green-400" : card.strength > 50 ? "text-amber-400" : "text-red-400"}`}>
                {card.strength}% retained
              </span>
            </div>
            <div className="h-1 rounded-full bg-white/[0.06] overflow-hidden mb-2">
              <div
                className={`h-full rounded-full animate-fill ${card.strength > 70 ? "bg-green-500" : card.strength > 50 ? "bg-amber-500" : "bg-red-500"}`}
                style={{ width: `${card.strength}%` }}
              />
            </div>
            <span className="text-[10px] text-[#6e6e78]">{card.interval}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Main Page ─── */
export default async function LandingPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (user) {
    redirect("/dashboard");
  }

  return (
    <div className="min-h-screen bg-[#0a0a0c]">
      {/* ─── Nav ─── */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] bg-[#0a0a0c]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between px-6">
          <div className="flex items-center gap-2.5">
            <div className="flex h-7 w-7 items-center justify-center rounded-[6px] bg-gradient-to-b from-amber-400 to-amber-500">
              <span className="text-sm font-bold text-[#0a0a0c]">L</span>
            </div>
            <span className="text-[15px] font-semibold text-[#eeeeef] tracking-[-0.02em]">
              LearnTrellis
            </span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              href="/login"
              className="text-[13px] font-medium text-[#6e6e78] hover:text-[#eeeeef] transition-colors"
            >
              Sign in
            </Link>
            <Link
              href="/signup"
              className="inline-flex h-8 items-center justify-center rounded-[8px] bg-gradient-to-b from-amber-400 to-amber-500 px-4 text-[13px] font-semibold text-[#0a0a0c] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      {/* ─── 1. Hero ─── bg: base */}
      <section className="relative px-6 pt-[140px] pb-[60px]">
        {/* Ambient glow */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 60% 40% at 50% 0%, rgba(245,158,11,0.12), transparent 70%)",
          }}
        />
        <div className="relative mx-auto max-w-[1200px] text-center">
          <h1 className="mx-auto max-w-[700px] text-[48px] max-md:text-[32px] font-semibold leading-[1.05] tracking-[-0.03em] text-[#eeeeef]">
            Learn anything.{" "}
            <span className="text-[#6e6e78]">
              Master it completely.
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-[480px] text-[17px] max-md:text-[15px] leading-[1.6] text-[#a8a8b0]">
            AI builds your curriculum, adapts to your level, and uses spaced repetition so you actually retain what you learn.
          </p>
          <div className="mt-8 flex items-center justify-center gap-3 max-md:flex-col">
            <Link
              href="/signup"
              className="inline-flex h-11 items-center justify-center rounded-[8px] bg-gradient-to-b from-amber-400 to-amber-500 px-7 text-[14px] font-semibold text-[#0a0a0c] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover max-md:w-full"
            >
              Start Learning Free
            </Link>
            <Link
              href="/login"
              className="inline-flex h-11 items-center justify-center rounded-[8px] border border-white/[0.10] bg-white/[0.03] px-7 text-[14px] font-medium text-[#eeeeef] transition-all duration-150 hover:bg-white/[0.06] hover:border-white/[0.16] max-md:w-full"
            >
              Sign In
            </Link>
          </div>
        </div>
      </section>

      {/* ─── 2. Product Mockup ─── bg: base */}
      <section className="relative px-6 pb-[120px] max-md:pb-[80px]">
        {/* Glow behind mockup */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            backgroundImage:
              "radial-gradient(ellipse 80% 60% at 50% 30%, rgba(255,255,255,0.03), transparent 70%)",
          }}
        />
        <div className="relative">
          <ProductMockup />
        </div>
      </section>

      {/* ─── 3. Social Proof Bar ─── bg: raised */}
      <section className="bg-[#111113] border-y border-white/[0.06] px-6 py-12">
        <div className="mx-auto max-w-[800px] text-center">
          <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[#6e6e78] mb-5">Powered by proven methodology</p>
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-3">
            {[
              { name: "Bloom's Taxonomy", desc: "Structured cognitive levels" },
              { name: "Spaced Repetition", desc: "Optimal review intervals" },
              { name: "Mastery Learning", desc: "Prove before advancing" },
              { name: "Adaptive Testing", desc: "AI-adjusted difficulty" },
            ].map((item) => (
              <div key={item.name} className="text-center px-2">
                <span className="block text-[14px] font-medium text-[#eeeeef]">
                  {item.name}
                </span>
                <span className="block text-[12px] text-[#6e6e78] mt-0.5">
                  {item.desc}
                </span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── 4. Feature: Assessment ─── bg: base */}
      <section className="px-6 py-[120px] max-md:py-[80px]">
        <Reveal className="mx-auto max-w-[1000px]">
          <FeatureSection
            eyebrow="1.0 Baseline"
            title="We start by understanding"
            titleGray="exactly where you are"
            description="No wasted time on what you already know. An adaptive assessment maps your current knowledge across every dimension of your topic, then builds from there."
            visual={<AssessmentVisual />}
          />
        </Reveal>
      </section>

      {/* ─── 5. Feature: Curriculum ─── bg: raised */}
      <section className="bg-[#111113] px-6 py-[120px] max-md:py-[80px]">
        <Reveal className="mx-auto max-w-[1000px]">
          <FeatureSection
            eyebrow="2.0 Curriculum"
            title="A learning path built"
            titleGray="specifically for you"
            description="AI generates a structured curriculum matched to Bloom's taxonomy. Each module builds on the last, with mastery gates that ensure you're ready before advancing."
            visual={<CurriculumVisual />}
            reverse
          />
        </Reveal>
      </section>

      {/* ─── 6. Feature: Retention ─── bg: base */}
      <section className="px-6 py-[120px] max-md:py-[80px]">
        <Reveal className="mx-auto max-w-[1000px]">
          <FeatureSection
            eyebrow="3.0 Retention"
            title="Actually remember"
            titleGray="what you learn"
            description="Concepts resurface at scientifically optimal intervals. Spaced repetition cards track your retention strength and schedule reviews right before you'd forget."
            visual={<RetentionVisual />}
          />
        </Reveal>
      </section>

      {/* ─── 7. CTA ─── bg: raised */}
      <section className="bg-[#111113] border-t border-white/[0.06] px-6 py-[100px] max-md:py-[64px]">
        <Reveal className="mx-auto max-w-[600px] text-center">
          <h2 className="text-[32px] max-md:text-[24px] font-semibold tracking-[-0.025em] text-[#eeeeef]">
            Ready to learn{" "}<span className="text-[#6e6e78]">something new?</span>
          </h2>
          <p className="mt-4 text-[16px] text-[#a8a8b0]">
            Your first personalized curriculum in under 5 minutes. Free to start.
          </p>
          <Link
            href="/signup"
            className="mt-8 inline-flex h-11 items-center justify-center rounded-[8px] bg-gradient-to-b from-amber-400 to-amber-500 px-7 text-[14px] font-semibold text-[#0a0a0c] shadow-button-primary transition-all duration-150 hover:from-amber-300 hover:to-amber-400 hover:shadow-button-primary-hover"
          >
            Get Started Free
          </Link>
        </Reveal>
      </section>

      {/* ─── Footer ─── */}
      <footer className="border-t border-white/[0.06] bg-[#0a0a0c] px-6 py-10">
        <div className="mx-auto max-w-[1200px]">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-5 w-5 items-center justify-center rounded-[4px] bg-gradient-to-b from-amber-400 to-amber-500">
                  <span className="text-[8px] font-bold text-[#0a0a0c]">L</span>
                </div>
                <span className="text-[13px] font-semibold text-[#eeeeef] tracking-[-0.01em]">LearnTrellis</span>
              </div>
              <p className="text-[12px] text-[#45454d]">AI-powered adaptive learning platform</p>
            </div>
            <div className="flex gap-6 text-[13px]">
              <Link href="/login" className="text-[#6e6e78] hover:text-[#a8a8b0] transition-colors">Sign in</Link>
              <Link href="/signup" className="text-[#6e6e78] hover:text-[#a8a8b0] transition-colors">Get started</Link>
            </div>
          </div>
          <div className="mt-6 pt-6 border-t border-white/[0.04] text-[12px] text-[#45454d]">
            &copy; 2026 LearnTrellis. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
