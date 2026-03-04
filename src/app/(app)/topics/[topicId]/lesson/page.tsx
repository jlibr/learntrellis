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
      <div className="mx-auto max-w-3xl py-12">
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

  if (phase === "loading") {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <div className="flex flex-col items-center justify-center py-12">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
            <p className="mt-4 text-zinc-300">Preparing your lesson...</p>
            <p className="mt-1 text-sm text-zinc-500">This may take a moment</p>
          </div>
        </Card>
      </div>
    );
  }

  if (phase === "complete") {
    return (
      <div className="mx-auto max-w-3xl py-12">
        <Card>
          <div className="text-center py-8">
            <div className="text-4xl mb-4">&#10003;</div>
            <h2 className="text-xl font-semibold text-zinc-100">Lesson Complete</h2>
            <p className="mt-2 text-zinc-400">Loading next step...</p>
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
            <h2 className="text-xl font-semibold text-zinc-100">How did that feel?</h2>
            <p className="text-sm text-zinc-400">
              Your feedback helps us calibrate future lessons.
            </p>

            <div className="grid grid-cols-3 gap-4">
              {(["easy", "right", "hard"] as const).map((option) => (
                <button
                  key={option}
                  onClick={() => setPulse(option)}
                  className={`rounded-lg border p-4 text-center transition-colors ${
                    pulse === option
                      ? "border-amber-500 bg-amber-500/10"
                      : "border-zinc-700 hover:border-zinc-600"
                  }`}
                >
                  <span className="text-2xl">
                    {option === "easy" ? "\u{1F60A}" : option === "right" ? "\u{1F44D}" : "\u{1F4AA}"}
                  </span>
                  <p className={`mt-2 text-sm font-medium ${
                    pulse === option ? "text-amber-400" : "text-zinc-300"
                  }`}>
                    {option === "easy" ? "Too Easy" : option === "right" ? "Just Right" : "Challenging"}
                  </p>
                </button>
              ))}
            </div>

            {/* Practice summary */}
            {Object.keys(grades).length > 0 && (
              <div className="border-t border-zinc-800 pt-4">
                <p className="text-sm text-zinc-400 mb-2">Practice Results:</p>
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
                      <span className="text-zinc-400">Q{Number(idx) + 1}: {result.grade}</span>
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
      <div className="mx-auto max-w-3xl py-8">
        {/* Lesson header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/topics/${topicId}`)}
          >
            &larr; Back to Topic
          </Button>
        </div>

        {/* Objective */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Objective
          </h2>
          <p className="mt-2 text-lg text-zinc-200">{content.objective}</p>
        </section>

        {/* Why it matters */}
        <section className="mb-8">
          <h2 className="text-sm font-medium text-amber-500 uppercase tracking-wide">
            Why This Matters
          </h2>
          <p className="mt-2 text-zinc-300">{content.whyItMatters}</p>
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
            className="prose prose-invert prose-zinc max-w-none prose-headings:text-zinc-200 prose-p:text-zinc-300 prose-strong:text-zinc-200 prose-code:text-amber-400 prose-code:bg-zinc-800 prose-code:px-1 prose-code:py-0.5 prose-code:rounded prose-pre:bg-zinc-900 prose-pre:border prose-pre:border-zinc-800"
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
              <li key={idx} className="flex items-start gap-2 text-zinc-300">
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
                <p className="text-xs font-medium text-zinc-500 uppercase">Problem</p>
                <p className="mt-1 text-zinc-200">{content.workedExample.problem}</p>
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase">Solution</p>
                <div
                  className="mt-1 text-zinc-300"
                  dangerouslySetInnerHTML={{ __html: markdownToHtml(content.workedExample.solution) }}
                />
              </div>
              <div>
                <p className="text-xs font-medium text-zinc-500 uppercase">Why This Works</p>
                <p className="mt-1 text-zinc-400">{content.workedExample.explanation}</p>
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
          <h2 className="text-lg font-medium text-zinc-200">Practice</h2>
          <span className="text-sm text-zinc-500">
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

            <p className="text-zinc-200 text-lg">{currentQuestion.question}</p>

            {/* MC options */}
            {currentQuestion.type === "mc" && currentQuestion.options && (
              <div className="space-y-2">
                {currentQuestion.options.map((option, idx) => (
                  <button
                    key={idx}
                    onClick={() => !gradeResult && setSelectedAnswer(option)}
                    disabled={!!gradeResult}
                    className={`w-full rounded-md border px-4 py-3 text-left text-sm transition-colors ${
                      gradeResult
                        ? option === currentQuestion.correctAnswer
                          ? "border-green-500 bg-green-500/10 text-green-300"
                          : selectedAnswer === option
                          ? "border-red-500 bg-red-500/10 text-red-300"
                          : "border-zinc-800 text-zinc-500"
                        : selectedAnswer === option
                        ? "border-amber-500 bg-amber-500/10 text-zinc-100"
                        : "border-zinc-700 bg-zinc-900 text-zinc-300 hover:border-zinc-600"
                    }`}
                  >
                    {option}
                  </button>
                ))}
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
              <div className={`rounded-md border p-4 ${
                gradeResult.grade === "correct" || gradeResult.grade === "excellent"
                  ? "border-green-500/20 bg-green-500/5"
                  : gradeResult.grade === "adequate"
                  ? "border-amber-500/20 bg-amber-500/5"
                  : "border-red-500/20 bg-red-500/5"
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
                <p className="mt-1 text-sm text-zinc-300">{gradeResult.feedback}</p>

                {showExplanation && currentQuestion.explanation && (
                  <div className="mt-3 border-t border-zinc-700 pt-3">
                    <p className="text-xs text-zinc-500 uppercase font-medium">Explanation</p>
                    <p className="mt-1 text-sm text-zinc-400">{currentQuestion.explanation}</p>
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

  return null;
}

/**
 * Minimal markdown to HTML converter for lesson content.
 * Handles: headers, bold, italic, code, code blocks, lists, paragraphs.
 */
function markdownToHtml(md: string): string {
  if (!md) return "";

  let html = md
    // Code blocks
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
