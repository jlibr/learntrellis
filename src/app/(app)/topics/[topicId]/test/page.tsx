"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import {
  generateMasteryTest,
  evaluateMasteryTest,
} from "@/app/(app)/topics/actions";

type TestQuestion = {
  type: "mc" | "open_ended";
  question: string;
  options?: string[];
  correctAnswer: string;
  area: string;
};

type UserAnswer = {
  questionIndex: number;
  question: string;
  type: "mc" | "open_ended";
  userAnswer: string;
  correctAnswer: string;
  area: string;
};

type Phase = "loading" | "testing" | "evaluating" | "results";

export default function MasteryTestPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = params.topicId as string;
  const moduleId = searchParams.get("moduleId");

  const [phase, setPhase] = useState<Phase>("loading");
  const [testId, setTestId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<TestQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [answers, setAnswers] = useState<UserAnswer[]>([]);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [openAnswer, setOpenAnswer] = useState("");
  const [error, setError] = useState<string | null>(null);

  // Results
  const [score, setScore] = useState(0);
  const [passed, setPassed] = useState(false);
  const [areaScores, setAreaScores] = useState<Record<string, number>>({});
  const [statusMessage, setStatusMessage] = useState("");
  const [resultStatus, setResultStatus] = useState<string>("");

  // Generate mastery test
  useEffect(() => {
    if (!moduleId) {
      setError("No module selected.");
      return;
    }

    async function loadTest() {
      const result = await generateMasteryTest(moduleId!);
      if (result.success) {
        setTestId(result.data.testId);
        setQuestions(result.data.questions);
        setPhase("testing");
      } else {
        setError(result.error);
      }
    }
    loadTest();
  }, [moduleId]);

  const currentQuestion = questions[currentIdx];
  const progressPercent = questions.length > 0
    ? Math.round(((currentIdx) / questions.length) * 100)
    : 0;

  function handleSubmitAnswer() {
    if (!currentQuestion) return;

    const answer = currentQuestion.type === "mc" ? selectedAnswer : openAnswer;

    const userAnswer: UserAnswer = {
      questionIndex: currentIdx,
      question: currentQuestion.question,
      type: currentQuestion.type,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      area: currentQuestion.area,
    };

    const newAnswers = [...answers, userAnswer];
    setAnswers(newAnswers);

    if (currentIdx < questions.length - 1) {
      setCurrentIdx(prev => prev + 1);
      setSelectedAnswer("");
      setOpenAnswer("");
    } else {
      // All questions answered, evaluate
      evaluateTest(newAnswers);
    }
  }

  async function evaluateTest(allAnswers: UserAnswer[]) {
    if (!testId || !moduleId) return;

    setPhase("evaluating");

    const result = await evaluateMasteryTest(testId, moduleId, allAnswers);

    if (result.success) {
      setScore(result.data.score);
      setPassed(result.data.passed);
      setAreaScores(result.data.areaScores);
      setStatusMessage(result.data.message);
      setResultStatus(result.data.status);
      setPhase("results");
    } else {
      setError(result.error);
    }
  }

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
            <p className="text-sm text-[#A8A29E]">{error}</p>
            <Button variant="secondary" onClick={() => router.push(`/topics/${topicId}`)}>
              Back to Topic
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "loading" || phase === "evaluating") {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-4 text-[#EDEDEB]">
              {phase === "loading" ? "Generating mastery test..." : "Evaluating your answers..."}
            </p>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "results") {
    return (
      <div className="mx-auto max-w-2xl py-12 animate-in">
        <h1 className="text-2xl font-bold text-[#EDEDEB] tracking-[-0.025em] mb-6">Mastery Test Results</h1>

        <Card>
          <div className="space-y-6">
            {/* Score */}
            <div className="text-center">
              <p className={`text-5xl font-bold ${
                passed ? "text-green-400" : "text-red-400"
              }`}>
                {Math.round(score)}%
              </p>
              <Badge
                variant={passed ? "success" : "danger"}
                className="mt-2"
              >
                {passed ? "PASSED" : "NOT PASSED"}
              </Badge>
              <p className="mt-3 text-[#EDEDEB]">{statusMessage}</p>
            </div>

            {/* Area breakdown */}
            <div className="border-t border-white/[0.08] pt-4">
              <h3 className="text-sm font-medium text-[#A8A29E] mb-3">Score by Area</h3>
              <div className="space-y-3">
                {Object.entries(areaScores).map(([area, areaScore]) => (
                  <div key={area}>
                    <div className="flex items-center justify-between text-sm mb-1">
                      <span className="text-[#EDEDEB]">{area}</span>
                      <span className={
                        areaScore >= 80 ? "text-green-400" :
                        areaScore >= 60 ? "text-amber-400" : "text-red-400"
                      }>
                        {Math.round(areaScore)}%
                      </span>
                    </div>
                    <Progress value={areaScore} />
                  </div>
                ))}
              </div>
            </div>

            {/* Status-specific messaging */}
            {resultStatus === "mastery_pending" && (
              <div className="rounded-[8px] border border-amber-500/20 bg-amber-500/5 p-4">
                <p className="text-sm text-amber-400">
                  Come back in 24 hours for the confirmation test to lock in your mastery.
                </p>
              </div>
            )}

            {resultStatus === "mastered" && (
              <div className="rounded-[8px] border border-green-500/20 bg-green-500/5 p-4">
                <p className="text-sm text-green-400">
                  Module mastered! The next module has been unlocked.
                </p>
              </div>
            )}

            {resultStatus === "reteach" && (
              <div className="rounded-[8px] border border-red-500/20 bg-red-500/5 p-4">
                <p className="text-sm text-red-400">
                  Review the module material focusing on weak areas, then take the test again.
                  You have one reteach attempt.
                </p>
              </div>
            )}

            {resultStatus === "skipped_gap" && (
              <div className="rounded-[8px] border border-white/[0.16] bg-[#262320]/50 p-4">
                <p className="text-sm text-[#A8A29E]">
                  This module has been marked as a knowledge gap. It is visible on your dashboard
                  and you can revisit it later. The next module has been unlocked so you can continue.
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-center gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => router.push(`/topics/${topicId}`)}
              >
                Back to Topic
              </Button>
              {resultStatus === "reteach" && (
                <Button
                  onClick={() => {
                    // Reload the test
                    setPhase("loading");
                    setCurrentIdx(0);
                    setAnswers([]);
                    setSelectedAnswer("");
                    setOpenAnswer("");
                    async function reload() {
                      const result = await generateMasteryTest(moduleId!);
                      if (result.success) {
                        setTestId(result.data.testId);
                        setQuestions(result.data.questions);
                        setPhase("testing");
                      }
                    }
                    reload();
                  }}
                >
                  Retake Test
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Testing phase
  if (phase === "testing" && currentQuestion) {
    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-semibold text-[#EDEDEB]">Mastery Test</h1>
          <span className="text-sm text-[#8A8480]">
            {currentIdx + 1} of {questions.length}
          </span>
        </div>

        <Progress value={progressPercent} label="Test progress" className="mb-6" />

        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={currentQuestion.type === "mc" ? "info" : "warning"}>
                {currentQuestion.type === "mc" ? "Multiple Choice" : "Open-Ended"}
              </Badge>
              <span className="text-xs text-[#8A8480]">{currentQuestion.area}</span>
            </div>

            <p className="text-[#EDEDEB] text-lg">{currentQuestion.question}</p>

            {/* MC options */}
            {currentQuestion.type === "mc" && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedAnswer(option)}
                    className={`w-full rounded-[8px] border px-4 py-3.5 text-left text-[15px] transition-all duration-150 min-h-[48px] ${
                      selectedAnswer === option
                        ? "border-amber-500 bg-amber-500/10 text-[#EDEDEB]"
                        : "border-white/[0.10] bg-[#161513] text-[#EDEDEB] hover:border-white/[0.18]"
                    }`}
                  >
                    {option}
                  </button>
                ))}
              </div>
            )}

            {/* Open-ended */}
            {currentQuestion.type === "open_ended" && (
              <Textarea
                placeholder="Type your answer..."
                value={openAnswer}
                onChange={(e) => setOpenAnswer(e.target.value)}
                rows={5}
              />
            )}

            <div className="flex justify-between">
              <Button
                variant="ghost"
                onClick={() => {
                  // Submit "I don't know"
                  const answer: UserAnswer = {
                    questionIndex: currentIdx,
                    question: currentQuestion.question,
                    type: currentQuestion.type,
                    userAnswer: "I don't know",
                    correctAnswer: currentQuestion.correctAnswer,
                    area: currentQuestion.area,
                  };

                  const newAnswers = [...answers, answer];
                  setAnswers(newAnswers);

                  if (currentIdx < questions.length - 1) {
                    setCurrentIdx(prev => prev + 1);
                    setSelectedAnswer("");
                    setOpenAnswer("");
                  } else {
                    evaluateTest(newAnswers);
                  }
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
                {currentIdx < questions.length - 1 ? "Next" : "Submit Test"}
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback — shouldn't reach here, but show loading rather than blank screen
  return (
    <div className="mx-auto max-w-2xl py-12">
      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-[#A8A29E]">Loading...</p>
        </div>
      </Card>
    </div>
  );
}
