"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getDueReviews, reviewSrsCard } from "@/app/(app)/topics/actions";

type ReviewCard = {
  id: string;
  concept: string;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
};

type Phase = "loading" | "reviewing" | "show_answer" | "done";

const RATING_OPTIONS = [
  { label: "Blackout", value: "blackout" as const, grade: 0, color: "text-red-400 border-red-500/30 hover:bg-red-500/10" },
  { label: "Wrong", value: "wrong" as const, grade: 1, color: "text-red-300 border-red-500/20 hover:bg-red-500/5" },
  { label: "Hard", value: "hard" as const, grade: 3, color: "text-amber-400 border-amber-500/30 hover:bg-amber-500/10" },
  { label: "Good", value: "good" as const, grade: 4, color: "text-green-300 border-green-500/20 hover:bg-green-500/5" },
  { label: "Easy", value: "easy" as const, grade: 5, color: "text-green-400 border-green-500/30 hover:bg-green-500/10" },
];

export default function ReviewPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [cards, setCards] = useState<ReviewCard[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [totalReviewed, setTotalReviewed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Load due reviews
  useEffect(() => {
    async function loadReviews() {
      const result = await getDueReviews(topicId);
      if (result.success) {
        if (result.data.cards.length === 0) {
          setPhase("done");
        } else {
          setCards(result.data.cards);
          setPhase("reviewing");
        }
      } else {
        setError(result.error);
      }
    }
    loadReviews();
  }, [topicId]);

  const currentCard = cards[currentIdx];
  const progressPercent = cards.length > 0
    ? Math.round((totalReviewed / cards.length) * 100)
    : 0;

  // Parse concept and review prompt from the concept field
  const [conceptText, reviewPrompt] = currentCard
    ? currentCard.concept.split("\n---\n")
    : ["", ""];

  async function handleRating(grade: number) {
    if (!currentCard) return;

    setPhase("loading");

    const result = await reviewSrsCard(currentCard.id, grade);

    if (result.success) {
      setTotalReviewed(prev => prev + 1);

      if (currentIdx < cards.length - 1) {
        setCurrentIdx(prev => prev + 1);
        setPhase("reviewing");
      } else {
        setPhase("done");
      }
    } else {
      setError(result.error);
    }
  }

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="text-center">
            <p className="text-red-400">{error}</p>
            <Button className="mt-4" onClick={() => router.push(`/topics/${topicId}`)}>
              Back to Topic
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "done") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#10003;</div>
            <h2 className="text-xl font-semibold text-[#EDEDEB]">
              {totalReviewed > 0 ? "Review Complete!" : "No Reviews Due"}
            </h2>
            <p className="mt-2 text-[#A8A29E]">
              {totalReviewed > 0
                ? `You reviewed ${totalReviewed} concept${totalReviewed === 1 ? "" : "s"}.`
                : "All concepts are up to date. Come back later."}
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button
                variant="secondary"
                onClick={() => router.push(`/topics/${topicId}`)}
              >
                Back to Topic
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-semibold text-[#EDEDEB]">Spaced Review</h1>
        <span className="text-sm text-[#8A8480]">
          {currentIdx + 1} of {cards.length}
        </span>
      </div>

      <Progress value={progressPercent} label="Review progress" className="mb-6" />

      <Card>
        <div className="space-y-6">
          {/* Review prompt (question) */}
          {phase === "reviewing" && (
            <>
              <div className="min-h-[120px] flex flex-col items-center justify-center text-center py-6">
                <p className="text-lg text-[#EDEDEB]">
                  {reviewPrompt || conceptText}
                </p>
              </div>

              <div className="flex justify-center">
                <Button onClick={() => setPhase("show_answer")}>
                  Show Answer
                </Button>
              </div>
            </>
          )}

          {/* Show answer + rating */}
          {phase === "show_answer" && (
            <>
              <div className="min-h-[120px] flex flex-col items-center justify-center text-center py-6">
                <p className="text-sm text-[#8A8480] mb-2">Question:</p>
                <p className="text-[#EDEDEB] mb-4">
                  {reviewPrompt || "Recall this concept:"}
                </p>
                <div className="border-t border-white/[0.08] pt-4 w-full">
                  <p className="text-sm text-[#8A8480] mb-2">Answer:</p>
                  <p className="text-lg text-[#EDEDEB]">{conceptText}</p>
                </div>
              </div>

              <div>
                <p className="text-center text-sm text-[#A8A29E] mb-3">
                  How well did you remember?
                </p>
                <div className="flex gap-2">
                  {RATING_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => handleRating(option.grade)}
                      className={`flex-1 rounded-[8px] border px-2 py-3 text-center text-sm font-medium transition-all duration-150 min-h-[48px] ${option.color}`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            </>
          )}

          {/* Card metadata */}
          <div className="border-t border-white/[0.08] pt-3 flex items-center justify-between text-xs text-[#57534E]">
            <span>Interval: {currentCard?.interval_days}d</span>
            <span>EF: {currentCard?.ease_factor.toFixed(2)}</span>
            <span>Reps: {currentCard?.repetitions}</span>
          </div>
        </div>
      </Card>
    </div>
  );
}
