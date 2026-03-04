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
      const result = await generateDimensions(topicId);
      if (result.success) {
        setDimensions(result.data.dimensions);
        setPhase("loading"); // Will load first question
      } else {
        setError(result.error);
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
    const result = await generateAssessmentQuestion(
      topicId,
      dim.name,
      difficulty,
      previousQuestions
    );

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

    const evalResult = await evaluateAssessmentAnswer(
      topicId,
      currentQuestion.question,
      answer,
      currentQuestion.correctAnswer,
      currentQuestion.type
    );

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

    const evalResult = await evaluateAssessmentAnswer(
      topicId,
      `Follow-up: Explain your understanding of ${currentQuestion.question}`,
      answer,
      currentQuestion.correctAnswer,
      "open_ended"
    );

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
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="text-center">
            <p className="text-red-400">{error}</p>
            <Button className="mt-4" onClick={() => { setError(null); setPhase("loading"); }}>
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
            <p className="text-zinc-300 font-medium">
              {curriculumGenerating
                ? "Building your personalized curriculum..."
                : "Analyzing your responses..."}
            </p>
            <p className="mt-2 text-sm text-zinc-500">This may take a moment</p>
          </div>
        </Card>

        {dimensionResults.length > 0 && (
          <Card className="mt-6">
            <h3 className="text-sm font-medium text-zinc-300 mb-3">Assessment Summary</h3>
            <div className="space-y-2">
              {dimensionResults.map((r) => (
                <div key={r.name} className="flex items-center justify-between text-sm">
                  <span className="text-zinc-400">{r.name}</span>
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
        <h1 className="text-2xl font-semibold text-zinc-100">Baseline Assessment</h1>
        <p className="mt-2 text-sm text-zinc-400">
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
        <h1 className="text-2xl font-semibold text-zinc-100">Baseline Assessment</h1>
        <div className="mt-4">
          <Progress value={progressPercent} label="Assessment progress" />
        </div>

        <Card className="mt-6">
          <div className="space-y-4">
            <p className="text-sm text-amber-400">Follow-up question</p>
            <p className="text-zinc-200">
              Can you explain your reasoning? Why did you choose that answer for:
            </p>
            <p className="text-sm text-zinc-400 italic">{currentQuestion?.question}</p>

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
      <h1 className="text-2xl font-semibold text-zinc-100">Baseline Assessment</h1>
      <p className="mt-2 text-sm text-zinc-400">
        Answer questions to help us understand your current level.
      </p>
      <div className="mt-4">
        <Progress value={progressPercent} label="Assessment progress" />
      </div>

      {currentQuestion && (
        <Card className="mt-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs text-zinc-500">
                Dimension: {dimensions[currentDimIndex]?.name}
              </span>
              <span className="text-xs text-zinc-500">
                {currentDimIndex + 1} of {dimensions.length}
              </span>
            </div>

            <p className="text-zinc-200 text-lg">{currentQuestion.question}</p>

            {currentQuestion.type === "mc" && currentQuestion.options ? (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      selectedAnswer === option
                        ? "border-amber-500 bg-amber-500/10 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}

                {/* Narrowed to 2 option */}
                <button
                  onClick={() => setSelectedAnswer("Narrowed to 2")}
                  className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                    selectedAnswer === "Narrowed to 2"
                      ? "border-blue-500 bg-blue-500/10 text-blue-300"
                      : "border-zinc-800 bg-zinc-950 text-zinc-500 hover:border-zinc-700"
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
