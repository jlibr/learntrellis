"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { createTopic } from "@/app/(app)/topics/actions";

export default function NewTopicPage() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [goal, setGoal] = useState("");
  const [background, setBackground] = useState("");
  const [quickStart, setQuickStart] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const result = await createTopic({ title, goal, background, quickStart });

      if (!result.success) {
        setError(result.error);
        setLoading(false);
        return;
      }

      // Navigate to assessment or topic overview
      if (quickStart) {
        router.push(`/topics/${result.data.topicId}/assess`);
      } else {
        router.push(`/topics/${result.data.topicId}/assess`);
      }
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto max-w-[640px] py-12">
      <h1 className="text-2xl font-bold text-[#EDEDEB] tracking-[-0.025em]">New Learning Topic</h1>
      <p className="mt-2 text-sm text-[#A8A29E]">
        Tell us what you want to learn and we will build a personalized curriculum.
      </p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-6">
        <Card>
          <div className="space-y-5">
            <Input
              label="What do you want to learn?"
              placeholder="e.g., Machine Learning, Spanish, Music Theory..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              maxLength={200}
              required
            />

            <Textarea
              label="What is your goal?"
              placeholder="e.g., Build a recommendation system from scratch, Have conversational fluency in 6 months..."
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
              maxLength={1000}
              rows={3}
            />

            <Textarea
              label="What do you already know?"
              placeholder="e.g., I have a basic understanding of Python and statistics, I know some basic phrases..."
              value={background}
              onChange={(e) => setBackground(e.target.value)}
              maxLength={2000}
              rows={3}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                role="switch"
                aria-checked={quickStart}
                onClick={() => setQuickStart(!quickStart)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0F0E0D] ${
                  quickStart ? "bg-amber-500" : "bg-white/[0.12]"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    quickStart ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
              <div>
                <span className="text-sm font-medium text-[#EDEDEB]">Quick start</span>
                <p className="text-xs text-[#8A8480]">Skip detailed onboarding, use a shorter assessment</p>
              </div>
            </div>
          </div>
        </Card>

        {error && (
          <div className="rounded-[8px] border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <div className="flex items-center justify-end gap-3">
          <Button
            type="button"
            variant="ghost"
            onClick={() => router.push("/dashboard")}
          >
            Cancel
          </Button>
          <Button type="submit" disabled={loading || !title.trim()}>
            {loading ? "Creating..." : "Start Learning"}
          </Button>
        </div>
      </form>
    </div>
  );
}
