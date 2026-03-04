"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  generateDimensions,
  generateAssessmentQuestion,
  evaluateAssessmentAnswer,
  finalizeBaseline,
  generateCurriculum,
} from "@/app/(app)/topics/actions";

type Dimension = { name: string; description: string };
type QuestionData = {
  question: string;
  type: "mc" | "open_ended";
  options?: string[];
  correctAnswer: string;
};
type DimensionResult = {
  name: string;
  signal: "strong" | "adequate" | "weak";
  evidence: string;
  questionsAsked: number;
};

type Phase = "loading" | "question" | "followup" | "evaluating" | "finalizing" | "done";

export default function AssessPage() {
  const router = useRouter();
  const params = useParams();
  const topicId = params.topicId as string;

  const [phase, setPhase] = useState<Phase>("loading");
  const [dimensions, setDimensions] = useState<Dimension[]>([]);
  const [currentDimIndex, setCurrentDimIndex] = useState(0);
  const [currentQuestion, setCurrentQuestion] = useState<QuestionData | null>(null);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [openAnswer, setOpenAnswer] = useState("");
  const [previousQuestions, setPreviousQuestions] = useState<string[]>([]);
  const [dimensionResults, setDimensionResults] = useState<DimensionResult[]>([]);
  const [difficulty, setDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [error, setError] = useState<string | null>(null);
  const [curriculumGenerating, setCurriculumGenerating] = useState(false);

  // Total questions asked across all dimensions
  const totalQuestionsAsked = dimensionResults.reduce((sum, d) => sum + d.questionsAsked, 0)
    + (currentQuestion ? 1 : 0);
  const progressPercent = dimensions.length > 0
    ? Math.round((currentDimIndex / dimensions.length) * 100)
    : 0;

  // Load dimensions on mount
  useEffect(() => {
    async function loadDimensions() {
      try {
        const result = await generateDimensions(topicId);
        if (result.success) {
          setDimensions(result.data.dimensions);
          setPhase("loading"); // Will load first question
        } else {
          setError(result.error);
        }
      } catch (err) {
        setError(`Failed to load dimensions: ${err instanceof Error ? err.message : "Request timed out."}`);
      }
    }
    loadDimensions();
  }, [topicId]);

  // Load question when dimension index changes
  const loadQuestion = useCallback(async (dimIndex: number) => {
    if (dimIndex >= dimensions.length) {
      // All dimensions assessed
      setPhase("finalizing");
      return;
    }

    setPhase("loading");
    setSelectedAnswer("");
    setOpenAnswer("");

    const dim = dimensions[dimIndex];
    let result;
    try {
      result = await generateAssessmentQuestion(
        topicId,
        dim.name,
        difficulty,
        previousQuestions
      );
    } catch (err) {
      setError(`Failed to generate question: ${err instanceof Error ? err.message : "Request timed out."}`);
      return;
    }

    if (result.success) {
      setCurrentQuestion(result.data);
      setPhase("question");
    } else {
      setError(result.error);
    }
  }, [dimensions, difficulty, previousQuestions, topicId]);

  // Trigger question load when dimensions are ready
  useEffect(() => {
    if (dimensions.length > 0 && phase === "loading" && !currentQuestion) {
      loadQuestion(currentDimIndex);
    }
  }, [dimensions, currentDimIndex, phase, currentQuestion, loadQuestion]);

  async function handleSubmitAnswer() {
    if (!currentQuestion) return;

    const answer = currentQuestion.type === "mc" ? selectedAnswer : openAnswer;
    if (!answer.trim()) return;

    setPhase("evaluating");

    let evalResult;
    try {
      evalResult = await evaluateAssessmentAnswer(
        topicId,
        currentQuestion.question,
        answer,
        currentQuestion.correctAnswer,
        currentQuestion.type
      );
    } catch (err) {
      setError(`Evaluation failed: ${err instanceof Error ? err.message : "Request timed out. Please try again."}`);
      return;
    }

    if (!evalResult.success) {
      setError(evalResult.error);
      return;
    }

    const { signal, needsFollowUp } = evalResult.data;

    // MC-strong validation: if MC correct, follow up with open-ended
    if (needsFollowUp && currentQuestion.type === "mc" && signal === "strong") {
      setPhase("followup");
      return;
    }

    // Record dimension result
    recordSignalAndAdvance(signal, evalResult.data.feedback);
  }

  async function handleFollowUpSubmit() {
    if (!currentQuestion) return;

    const answer = openAnswer;
    if (!answer.trim()) return;

    setPhase("evaluating");

    let evalResult;
    try {
      evalResult = await evaluateAssessmentAnswer(
        topicId,
        `Follow-up: Explain your understanding of ${currentQuestion.question}`,
        answer,
        currentQuestion.correctAnswer,
        "open_ended"
      );
    } catch (err) {
      setError(`Evaluation failed: ${err instanceof Error ? err.message : "Request timed out. Please try again."}`);
      return;
    }

    if (!evalResult.success) {
      setError(evalResult.error);
      return;
    }

    recordSignalAndAdvance(evalResult.data.signal, evalResult.data.feedback);
  }

  function recordSignalAndAdvance(signal: "strong" | "adequate" | "weak", evidence: string) {
    const dim = dimensions[currentDimIndex];

    // Adaptive difficulty for next question
    if (signal === "strong") {
      setDifficulty("hard");
    } else if (signal === "weak") {
      setDifficulty("easy");
    } else {
      setDifficulty("medium");
    }

    setPreviousQuestions(prev => [...prev, currentQuestion?.question || ""]);

    // Check if we already have a result for this dimension (updating)
    const existingIndex = dimensionResults.findIndex(r => r.name === dim.name);
    if (existingIndex >= 0) {
      setDimensionResults(prev => {
        const updated = [...prev];
        updated[existingIndex] = {
          ...updated[existingIndex],
          signal,
          evidence,
          questionsAsked: updated[existingIndex].questionsAsked + 1,
        };
        return updated;
      });
    } else {
      setDimensionResults(prev => [
        ...prev,
        { name: dim.name, signal, evidence, questionsAsked: 1 },
      ]);
    }

    // Move to next dimension
    setCurrentQuestion(null);
    setCurrentDimIndex(prev => prev + 1);
    setPhase("loading");
  }

  // Finalize when all dimensions are assessed
  useEffect(() => {
    if (phase !== "finalizing") return;
    if (dimensionResults.length === 0) return;

    async function finalize() {
      const result = await finalizeBaseline(topicId, dimensionResults);
      if (result.success) {
        setPhase("done");
        // Auto-generate curriculum
        setCurriculumGenerating(true);
        const currResult = await generateCurriculum(topicId);
        setCurriculumGenerating(false);
        if (currResult.success) {
          router.push(`/topics/${topicId}`);
        } else {
          setError(currResult.error);
        }
      } else {
        setError(result.error);
      }
    }
    finalize();
  }, [phase, dimensionResults, topicId, router]);

  if (error) {
    return (
      <div className="mx-auto max-w-2xl py-12 animate-in">
        <Card>
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-[#a8a8b0]">{error}</p>
            <Button variant="secondary" onClick={() => { setError(null); setPhase("loading"); }}>
              Try Again
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "finalizing" || phase === "done" || curriculumGenerating) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="text-center py-8">
            <div className="mx-auto mb-4 h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="text-[#eeeeef] font-medium">
              {curriculumGenerating
                ? "Building your personalized curriculum..."
                : "Analyzing your responses..."}
            </p>
            <p className="mt-2 text-sm text-[#6e6e78]">This may take a moment</p>
          </div>
        </Card>

        {dimensionResults.length > 0 && (
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-[#eeeeef] mb-3">Assessment Summary</h3>
            <div className="space-y-2">
              {dimensionResults.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <span className="text-[#a8a8b0]">{r.name}</span>
                  <span
                    className={
                      r.signal === "strong"
                        ? "text-green-400"
                        : r.signal === "adequate"
                        ? "text-amber-400"
                        : "text-red-400"
                    }
                  >
                    {r.signal}
                  </span>
                </div>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  }

  if (phase === "loading" || phase === "evaluating") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="text-2xl font-semibold text-[#eeeeef]">Baseline Assessment</h1>
        <p className="mt-2 text-sm text-[#a8a8b0]">
          {phase === "loading" ? "Preparing your next question..." : "Evaluating your answer..."}
        </p>
        <div className="mt-6">
          <Progress value={progressPercent} label="Assessment progress" />
        </div>
        <Card className="mt-6">
          <div className="flex items-center justify-center py-8">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          </div>
        </Card>
      </div>
    );
  }

  // Follow-up question for MC-strong validation
  if (phase === "followup") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <h1 className="text-2xl font-semibold text-[#eeeeef]">Baseline Assessment</h1>
        <div className="mt-4">
          <Progress value={progressPercent} label="Assessment progress" />
        </div>

        <Card className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-amber-400">Follow-up question</p>
            <p className="text-[#eeeeef]">
              Can you explain your reasoning? Why did you choose that answer for:
            </p>
            <p className="text-sm text-[#a8a8b0] italic">{currentQuestion?.question}</p>

            <Textarea
              placeholder="Explain your understanding in your own words..."
              value={openAnswer}
              onChange={(e) => setOpenAnswer(e.target.value)}
              rows={4}
            />

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => recordSignalAndAdvance("adequate", "MC correct but declined follow-up")}
              >
                Skip
              </Button>
              <Button onClick={handleFollowUpSubmit} disabled={!openAnswer.trim()}>
                Submit
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Main question display
  return (
    <div className="mx-auto max-w-2xl py-12">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold text-[#eeeeef]">Baseline Assessment</h1>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => router.push(`/topics/${topicId}`)}
        >
          Exit
        </Button>
      </div>
      <p className="mt-2 text-sm text-[#a8a8b0]">
        Answer questions to help us understand your current level.
      </p>
      <div className="mt-4">
        <Progress value={progressPercent} label="Assessment progress" />
      </div>

      {currentQuestion && (
        <Card className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-[#6e6e78]">
                Dimension: {dimensions[currentDimIndex]?.name}
              </span>
              <span className="text-xs text-[#6e6e78]">
                {currentDimIndex + 1} of {dimensions.length}
              </span>
            </div>

            <p className="text-[#eeeeef] text-lg">{currentQuestion.question}</p>

            {currentQuestion.type === "mc" && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full rounded-[8px] border px-4 py-3.5 text-left text-[15px] transition-all duration-150 min-h-[48px] ${
                      selectedAnswer === option
                        ? "border-amber-500 bg-amber-500/10 text-[#eeeeef]"
                        : "border-white/[0.10] bg-[#111113] text-[#eeeeef] hover:border-white/[0.18]"
                    }`}
                  >
                    {option}
                  </button>
                ))}

                {/* Narrowed to 2 option */}
                <button
                  onClick={() => setSelectedAnswer("Narrowed to 2")}
                  className={`w-full rounded-[8px] border px-4 py-3.5 text-left text-[15px] transition-all duration-150 min-h-[48px] ${
                    selectedAnswer === "Narrowed to 2"
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-white/[0.06] bg-[#0a0a0c] text-[#45454d] hover:border-white/[0.10]"
                  }`}
                >
                  I narrowed it down to 2 options
                </button>
              </div>
            ) : (
              <Textarea
                placeholder="Type your answer..."
                value={openAnswer}
                onChange={(e) => setOpenAnswer(e.target.value)}
                rows={4}
              />
            )}

            <div className="flex justify-end gap-3">
              <Button
                variant="ghost"
                onClick={() => {
                  setSelectedAnswer("I don't know");
                  // Immediately evaluate as weak signal
                  recordSignalAndAdvance("weak", "Learner selected 'I don't know'");
                }}
              >
                I don&apos;t know
              </Button>
              <Button
                onClick={handleSubmitAnswer}
                disabled={
                  currentQuestion.type === "mc"
                    ? !selectedAnswer
                    : !openAnswer.trim()
                }
              >
                Submit
              </Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
