"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { AudioPlayer } from "@/components/audio-player";
import { AudioRecorder } from "@/components/audio-recorder";
import { LessonImage } from "@/components/lesson-image";
import {
  generateLesson,
  completeLesson,
  gradeAnswer,
  extractConcepts,
} from "@/app/(app)/topics/actions";
import {
  getLessonTopicType,
  generateTTSAudio,
  transcribeAudio,
  generateLessonImage,
} from "@/app/(app)/topics/multimodal-actions";

type PracticeQuestion = {
  type: "mc" | "open_ended" | "worked_problem";
  question: string;
  options?: string[];
  correctAnswer: string;
  explanation: string;
};

type LessonContent = {
  objective: string;
  whyItMatters: string;
  material: string;
  keyTakeaways: string[];
  workedExample: { problem: string; solution: string; explanation: string };
  practiceQuestions: PracticeQuestion[];
  /** Optional: set by lesson author when visual content would add value */
  imagePrompt?: string;
  imageAltText?: string;
};

type GradeResult = {
  grade: string;
  feedback: string;
};

type Phase = "loading" | "reading" | "practice" | "pulse" | "complete";

export default function LessonPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const topicId = params.topicId as string;
  const lessonId = searchParams.get("lessonId");

  const [phase, setPhase] = useState<Phase>("loading");
  const [content, setContent] = useState<LessonContent | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [topicType, setTopicType] = useState<string | null>(null);

  // Practice state
  const [currentQuestionIdx, setCurrentQuestionIdx] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState("");
  const [openAnswer, setOpenAnswer] = useState("");
  const [grading, setGrading] = useState(false);
  const [grades, setGrades] = useState<Record<number, GradeResult>>({});
  const [showExplanation, setShowExplanation] = useState(false);

  // Difficulty pulse
  const [pulse, setPulse] = useState<"easy" | "right" | "hard" | null>(null);

  const isLanguageTopic = topicType === "language";

  // Load lesson content + topic type
  useEffect(() => {
    if (!lessonId) {
      setError("No lesson selected.");
      return;
    }

    async function loadLesson() {
      // Fetch topic_type in parallel with lesson generation
      const [lessonResult, typeResult] = await Promise.all([
        generateLesson(lessonId!),
        getLessonTopicType(lessonId!),
      ]);

      if (typeResult.success) {
        setTopicType(typeResult.topicType || null);
      }

      if (lessonResult.success) {
        setContent(lessonResult.data.content as LessonContent);
        setPhase("reading");
      } else {
        setError(lessonResult.error);
      }
    }
    loadLesson();
  }, [lessonId]);

  const currentQuestion = content?.practiceQuestions?.[currentQuestionIdx];
  const allQuestionsGraded = content
    ? Object.keys(grades).length >= content.practiceQuestions.length
    : false;

  async function handleGrade() {
    if (!currentQuestion || !lessonId || !content) return;

    const answer = currentQuestion.type === "mc" ? selectedAnswer : openAnswer;
    if (!answer.trim()) return;

    setGrading(true);

    const result = await gradeAnswer({
      lessonId,
      questionIndex: currentQuestionIdx,
      questionType: currentQuestion.type,
      question: currentQuestion.question,
      userAnswer: answer,
      correctAnswer: currentQuestion.correctAnswer,
      lessonObjective: content.objective,
      topicTitle: "", // Will be resolved server-side
    });

    if (result.success) {
      setGrades(prev => ({ ...prev, [currentQuestionIdx]: result.data }));
      setShowExplanation(true);
    } else {
      setError(result.error);
    }

    setGrading(false);
  }

  function handleNextQuestion() {
    if (content && currentQuestionIdx < content.practiceQuestions.length - 1) {
      setCurrentQuestionIdx(prev => prev + 1);
      setSelectedAnswer("");
      setOpenAnswer("");
      setShowExplanation(false);
    } else {
      // All questions done, move to difficulty pulse
      setPhase("pulse");
    }
  }

  async function handleCompletePulse() {
    if (!pulse || !lessonId) return;

    setPhase("loading");

    // Extract concepts for SRS
    await extractConcepts(lessonId);

    const result = await completeLesson(lessonId, pulse);

    if (result.success) {
      setPhase("complete");

      if (result.data.triggerMasteryTest) {
        // Redirect to mastery test
        setTimeout(() => {
          router.push(`/topics/${topicId}/test?moduleId=${result.data.moduleId}`);
        }, 2000);
      } else if (result.data.nextLessonId) {
        // Redirect to next lesson
        setTimeout(() => {
          router.push(`/topics/${topicId}/lesson?lessonId=${result.data.nextLessonId}`);
        }, 2000);
      } else {
        // Back to topic overview
        setTimeout(() => {
          router.push(`/topics/${topicId}`);
        }, 2000);
      }
    } else {
      setError(result.error);
    }
  }

  // Callback for STT transcription — fills in the open answer field
  const handleTranscriptionComplete = useCallback((text: string) => {
    setOpenAnswer(text);
  }, []);

  if (error) {
    return (
      <div className="mx-auto max-w-3xl py-12 animate-in">
        <Card>
          <div className="text-center py-4 space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-500/10 border border-red-500/20">
              <svg className="h-5 w-5 text-red-400" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
              </svg>
            </div>
            <p className="text-sm text-[#a8a8b0]">{error}</p>
            <Button variant="secondary" onClick={() => router.push(`/topics/${topicId}`)}>
              Back to Topic
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-4 text-[#eeeeef]">Preparing your lesson...</p>
            <p className="mt-1 text-sm text-[#6e6e78]">This may take a moment</p>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="mx-auto max-w-3xl py-12 animate-in">
        <Card>
          <div className="text-center py-8 space-y-4">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-green-500/10 border border-green-500/20">
              <svg className="h-6 w-6 text-green-400" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold text-[#eeeeef]">Lesson Complete</h2>
            <p className="text-[#a8a8b0]">Loading next step...</p>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "pulse") {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <div className="space-y-6">
            <h2 className="text-xl font-semibold text-[#eeeeef]">How did that feel?</h2>
            <p className="text-sm text-[#a8a8b0]">
              Your feedback helps us calibrate future lessons.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {(["easy", "right", "hard"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setPulse(option)}
                  className={`rounded-[8px] border p-4 text-center transition-all duration-150 min-h-[48px] ${
                    pulse === option
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-white/[0.12] hover:border-white/[0.16]"
                  }`}
                >
                  <span className="text-2xl">
                    {option === "easy" ? "\u{1F60A}" : option === "right" ? "\u{1F44D}" : "\u{1F4AA}"}
                  </span>
                  <p className={`mt-2 text-sm font-medium ${
                    pulse === option ? "text-amber-400" : "text-[#eeeeef]"
                  }`}>
                    {option === "easy" ? "Too Easy" : option === "right" ? "Just Right" : "Challenging"}
                  </p>
                </button>
              ))}
            </div>

            {/* Practice summary */}
            {Object.keys(grades).length > 0 && (
              <div className="border-t border-white/[0.08] pt-4">
                <p className="text-sm text-[#a8a8b0] mb-2">Practice Results:</p>
                <div className="space-y-1">
                  {Object.entries(grades).map(([idx, result]) => (
                    <div key={idx} className="flex items-center gap-2 text-sm">
                      <span className={
                        result.grade === "correct" || result.grade === "excellent"
                          ? "text-green-400" : result.grade === "adequate"
                          ? "text-amber-400" : "text-red-400"
                      }>
                        {result.grade === "correct" || result.grade === "excellent" ? "+" : "-"}
                      </span>
                      <span className="text-[#a8a8b0]">Q{Number(idx) + 1}: {result.grade}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end">
              <Button onClick={handleCompletePulse} disabled={!pulse}>
                Continue
              </Button>
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Reading phase — full-width lesson content
  if (phase === "reading" && content) {
    return (
      <div className="mx-auto max-w-[720px] px-6 py-8">
        {/* Sticky lesson header */}
        <div className="sticky top-0 z-10 h-14 flex items-center justify-between px-6 -mx-6 bg-[#0a0a0c]/90 backdrop-blur-[8px] border-b border-white/[0.06]">
          <button
            onClick={() => router.push(`/topics/${topicId}`)}
            className="text-sm text-[#a8a8b0] hover:text-[#eeeeef] transition-colors"
          >
            &larr; Back to Topic
          </button>
          <span className="text-sm text-[#6e6e78]">Lesson</span>
        </div>

        {/* Objective */}
        <section className="mt-8 mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Objective
          </h2>
          <p className="mt-2 text-lg text-[#eeeeef]">{content.objective}</p>
        </section>

        {/* Why it matters */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Why This Matters
          </h2>
          <p className="mt-2 text-[#eeeeef]">{content.whyItMatters}</p>
        </section>

        {/* Core material */}
        <section className="mb-8">
          {/* TTS: Listen to core material for language topics */}
          {isLanguageTopic && lessonId && (
            <AudioPlayer
              onRequestAudio={() => generateTTSAudio(lessonId, content.material)}
              label="Listen to lesson"
              className="mb-3"
            />
          )}
          <div
            className="lesson-prose"
            dangerouslySetInnerHTML={{ __html: markdownToHtml(content.material) }}
          />
        </section>

        {/* Image generation — when lesson content flags visual value */}
        {content.imagePrompt && lessonId && (
          <section className="mb-8">
            <LessonImage
              onRequestImage={() =>
                generateLessonImage(
                  lessonId,
                  content.imagePrompt!,
                  content.imageAltText || "Lesson illustration"
                )
              }
              altText={content.imageAltText || "Lesson illustration"}
            />
          </section>
        )}

        {/* Key takeaways */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Key Takeaways
          </h2>
          {/* TTS: Listen to takeaways for language topics */}
          {isLanguageTopic && lessonId && (
            <AudioPlayer
              onRequestAudio={() =>
                generateTTSAudio(lessonId, content.keyTakeaways.join(". "))
              }
              label="Listen"
              className="mt-1"
            />
          )}
          <ul className="mt-3 space-y-2">
            {content.keyTakeaways.map((takeaway, idx) => (
              <li key={idx} className="flex items-start gap-2 text-[#eeeeef]">
                <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                {takeaway}
              </li>
            ))}
          </ul>
        </section>

        {/* Worked example */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Worked Example
          </h2>
          <Card className="mt-3">
            <div className="space-y-4">
              <div>
                <p className="text-xs font-medium text-[#6e6e78] uppercase">Problem</p>
                <p className="mt-1 text-[#eeeeef]">{content.workedExample.problem}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-[#6e6e78] uppercase">Solution</p>
                <div
                  className="mt-1 text-[#eeeeef]"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content.workedExample.solution) }}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-[#6e6e78] uppercase">Why This Works</p>
                <p className="mt-1 text-[#a8a8b0]">{content.workedExample.explanation}</p>
              </div>
            </div>
          </Card>
        </section>

        {/* Move to practice */}
        <div className="flex justify-center py-8">
          <Button onClick={() => setPhase("practice")} size="lg">
            Start Practice ({content.practiceQuestions.length} questions)
          </Button>
        </div>
      </div>
    );
  }

  // Practice phase
  if (phase === "practice" && content && currentQuestion) {
    const gradeResult = grades[currentQuestionIdx];

    return (
      <div className="mx-auto max-w-2xl py-12">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-[#eeeeef]">Practice</h2>
          <span className="text-sm text-[#6e6e78]">
            {currentQuestionIdx + 1} of {content.practiceQuestions.length}
          </span>
        </div>

        <Card>
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Badge variant={
                currentQuestion.type === "mc" ? "info" :
                currentQuestion.type === "open_ended" ? "warning" : "default"
              }>
                {currentQuestion.type === "mc" ? "Multiple Choice" :
                 currentQuestion.type === "open_ended" ? "Open-Ended" : "Worked Problem"}
              </Badge>
            </div>

            {/* TTS: Listen to question for language topics */}
            {isLanguageTopic && lessonId && (
              <AudioPlayer
                onRequestAudio={() => generateTTSAudio(lessonId, currentQuestion.question)}
                label="Listen"
              />
            )}

            <p className="text-[#eeeeef] text-lg">{currentQuestion.question}</p>

            {/* MC options */}
            {currentQuestion.type === "mc" && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => {
                  const normMC = (s: string) => s.trim().toLowerCase().replace(/`/g, "").replace(/\s+/g, " ");
                  const isCorrectOption = normMC(option) === normMC(currentQuestion.correctAnswer);
                  return (
                  <button
                    key={idx}
                    onClick={() => !gradeResult && setSelectedAnswer(option)}
                    disabled={!!gradeResult}
                    className={`w-full rounded-[8px] border px-4 py-3.5 text-left text-[15px] transition-all duration-150 min-h-[48px] ${
                      gradeResult
                        ? isCorrectOption
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : selectedAnswer === option
                          ? "border-red-500 bg-red-500/10 text-red-300"
                          : "border-white/[0.06] text-[#45454d]"
                        : selectedAnswer === option
                        ? "border-amber-500 bg-amber-500/10 text-[#eeeeef]"
                        : "border-white/[0.10] bg-[#111113] text-[#eeeeef] hover:border-white/[0.18]"
                    }`}
                  >
                    {option}
                  </button>
                  );
                })}
              </div>
            )}

            {/* Open-ended / worked problem */}
            {(currentQuestion.type === "open_ended" || currentQuestion.type === "worked_problem") && (
              <>
                <Textarea
                  placeholder={
                    currentQuestion.type === "worked_problem"
                      ? "Show your work step by step..."
                      : "Type your answer..."
                  }
                  value={openAnswer}
                  onChange={(e) => setOpenAnswer(e.target.value)}
                  rows={currentQuestion.type === "worked_problem" ? 6 : 4}
                  disabled={!!gradeResult}
                />
                {/* STT: Record spoken answer for language topics */}
                {isLanguageTopic && lessonId && !gradeResult && (
                  <AudioRecorder
                    onTranscribe={(audioBase64) => transcribeAudio(lessonId, audioBase64)}
                    onTranscriptionComplete={handleTranscriptionComplete}
                    disabled={!!gradeResult}
                  />
                )}
              </>
            )}

            {/* Grade result */}
            {gradeResult && (
              <div className={`rounded-[8px] border p-4 ${
                gradeResult.grade === "correct" || gradeResult.grade === "excellent"
                  ? "border-green-500/20 bg-green-500/[0.05]"
                  : gradeResult.grade === "adequate"
                  ? "border-amber-500/20 bg-amber-500/[0.05]"
                  : "border-red-500/20 bg-red-500/[0.05]"
              }`}>
                <p className={`text-sm font-medium ${
                  gradeResult.grade === "correct" || gradeResult.grade === "excellent"
                    ? "text-green-400"
                    : gradeResult.grade === "adequate"
                    ? "text-amber-400"
                    : "text-red-400"
                }`}>
                  {gradeResult.grade.charAt(0).toUpperCase() + gradeResult.grade.slice(1)}
                </p>
                <p className="mt-1 text-sm text-[#eeeeef]">{gradeResult.feedback}</p>

                {showExplanation && currentQuestion.explanation && (
                  <div className="mt-3 border-t border-white/[0.08] pt-3">
                    <p className="text-xs text-[#6e6e78] uppercase font-medium">Explanation</p>
                    <p className="mt-1 text-sm text-[#a8a8b0]">{currentQuestion.explanation}</p>
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div className="flex justify-end gap-3">
              {!gradeResult ? (
                <>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedAnswer("I don't know");
                      handleGrade();
                    }}
                  >
                    I don&apos;t know
                  </Button>
                  <Button
                    onClick={handleGrade}
                    disabled={
                      grading ||
                      (currentQuestion.type === "mc" ? !selectedAnswer : !openAnswer.trim())
                    }
                  >
                    {grading ? "Grading..." : "Submit"}
                  </Button>
                </>
              ) : (
                <Button onClick={handleNextQuestion}>
                  {currentQuestionIdx < content.practiceQuestions.length - 1
                    ? "Next Question"
                    : "Finish Practice"}
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>
    );
  }

  // Fallback — shouldn't reach here, but show loading rather than blank screen
  return (
    <div className="mx-auto max-w-3xl py-12">
      <Card>
        <div className="flex flex-col items-center justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
          <p className="mt-4 text-[#a8a8b0]">Loading...</p>
        </div>
      </Card>
    </div>
  );
}

/**
 * Minimal markdown to HTML converter for lesson content.
 * Handles: headers, bold, italic, code, code blocks, lists, paragraphs.
 */
function markdownToHtml(md: string): string {
  if (!md) return "";

  const escHtml = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  // Escape all HTML first to prevent XSS from AI-generated content
  let escaped = escHtml(md);

  let html = escaped
    // Code blocks (already escaped, wrap in pre/code)
    .replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>')
    // Inline code
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    // Headers
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/^# (.+)$/gm, '<h1>$1</h1>')
    // Bold
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*([^*]+)\*/g, '<em>$1</em>')
    // Unordered lists
    .replace(/^- (.+)$/gm, '<li>$1</li>')
    // Ordered lists
    .replace(/^\d+\. (.+)$/gm, '<li>$1</li>')
    // Line breaks
    .replace(/\n\n/g, '</p><p>')
    .replace(/\n/g, '<br/>');

  // Wrap list items (using [\s\S]* instead of .* with s flag for ES2017 compat)
  html = html.replace(/(<li>[\s\S]*<\/li>)/g, '<ul>$1</ul>');
  // Prevent nested ul
  html = html.replace(/<\/ul>\s*<ul>/g, '');

  // Wrap in paragraph if not starting with block element
  if (!html.startsWith('<h') && !html.startsWith('<pre') && !html.startsWith('<ul')) {
    html = '<p>' + html + '</p>';
  }

  return html;
}
