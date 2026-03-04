"use server";

import { createClient } from "@/lib/supabase/server";
import { sanitizeInput } from "@/lib/utils";
import { getProviderConfig } from "@/app/(app)/settings/actions";
import { getModelForTask } from "@/lib/ai/models";
import {
  chatCompletion,
  chatCompletionStream,
  type ProviderConfig,
  type ProviderName,
  type Message,
} from "@/lib/ai/provider";
import {
  profilerSystemPrompt,
  curriculumArchitectSystemPrompt,
  lessonAuthorSystemPrompt,
  assessorSystemPrompt,
  srsExtractorSystemPrompt,
} from "@/lib/ai/prompts";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ActionResult<T = null> =
  | { success: true; data: T }
  | { success: false; error: string };

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function getConfig(model: string): Promise<ProviderConfig> {
  const result = await getProviderConfig(model);
  if (!result.success || !result.data) {
    throw new Error("No AI provider configured. Please add an API key in Settings.");
  }
  return {
    baseUrl: result.data.baseUrl,
    apiKey: result.data.apiKey,
    model: result.data.model,
  };
}

async function getConfigForTask(task: "profiling" | "curriculum" | "lesson" | "grading" | "srs_extraction" | "assessment" | "adaptation" | "resource_verification"): Promise<ProviderConfig> {
  const result = await getProviderConfig("_placeholder_");
  if (!result.success || !result.data) {
    throw new Error("No AI provider configured. Please add an API key in Settings.");
  }
  const provider = result.data.provider === "hosted" ? "openrouter" : result.data.provider as ProviderName;
  const model = getModelForTask(task, provider);
  return {
    baseUrl: result.data.baseUrl,
    apiKey: result.data.apiKey,
    model,
  };
}

function repairJsonNewlines(raw: string): string {
  // LLMs often output literal newlines/tabs inside JSON string values.
  // Walk the string character-by-character and escape them.
  let result = "";
  let inString = false;
  let escaped = false;
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i];
    if (escaped) { result += ch; escaped = false; continue; }
    if (ch === "\\" && inString) { result += ch; escaped = true; continue; }
    if (ch === '"') { inString = !inString; result += ch; continue; }
    if (inString) {
      if (ch === "\n") { result += "\\n"; continue; }
      if (ch === "\r") { result += "\\r"; continue; }
      if (ch === "\t") { result += "\\t"; continue; }
    }
    result += ch;
  }
  return result;
}

function parseJsonFromAI(content: string): unknown {
  // Try to extract JSON from markdown code blocks first
  const codeBlockMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlockMatch
    ? codeBlockMatch[1].trim()
    : (content.match(/(\{[\s\S]*\}|\[[\s\S]*\])/) || [null, content])[1];

  // First try direct parse, then try with newline repair
  try {
    return JSON.parse(raw);
  } catch {
    return JSON.parse(repairJsonNewlines(raw));
  }
}

// ---------------------------------------------------------------------------
// T8: Onboarding — Create Topic
// ---------------------------------------------------------------------------

export async function createTopic(formData: {
  title: string;
  goal: string;
  background: string;
  quickStart: boolean;
}): Promise<ActionResult<{ topicId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const title = sanitizeInput(formData.title.trim());
    const goal = sanitizeInput(formData.goal.trim());
    const background = sanitizeInput(formData.background.trim());

    if (!title || title.length < 2) {
      return { success: false, error: "Topic title is required (at least 2 characters)." };
    }
    if (title.length > 200) {
      return { success: false, error: "Topic title is too long (max 200 characters)." };
    }
    if (goal.length > 1000) {
      return { success: false, error: "Goal is too long (max 1000 characters)." };
    }
    if (background.length > 2000) {
      return { success: false, error: "Background is too long (max 2000 characters)." };
    }

    // Create the topic
    const { data: topic, error: topicError } = await supabase
      .from("topics")
      .insert({
        user_id: user.id,
        title,
        goal: goal || null,
        background: background || null,
        status: formData.quickStart ? "assessing" : "onboarding",
      })
      .select("id")
      .single();

    if (topicError || !topic) {
      console.error("Failed to create topic:", topicError?.message);
      return { success: false, error: "Failed to create topic." };
    }

    // Create initial learner profile
    const { error: profileError } = await supabase
      .from("learner_profiles")
      .insert({
        topic_id: topic.id,
        dimensions: null,
        depth: formData.quickStart ? "quick" : "standard",
        baseline_scores: null,
      });

    if (profileError) {
      console.error("Failed to create learner profile:", profileError.message);
      // Don't fail the whole operation — the topic was created
    }

    return { success: true, data: { topicId: topic.id } };
  } catch (err) {
    console.error("createTopic error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// T9: Baseline Assessment — Generate Dimensions
// ---------------------------------------------------------------------------

export async function generateDimensions(topicId: string): Promise<ActionResult<{
  dimensions: Array<{ name: string; description: string }>;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title, goal, background")
      .eq("id", topicId)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    console.log("[generateDimensions] topic found:", topic.title);
    const config = await getConfigForTask("assessment");
    console.log("[generateDimensions] config:", { baseUrl: config.baseUrl, model: config.model, hasKey: !!config.apiKey });

    const result = await chatCompletion(config, [
      {
        role: "system",
        content: `You are an expert learning assessor. Given a learning topic and goal, identify 3-6 key skill dimensions that should be assessed to understand the learner's current level.

Return a JSON object:
{
  "dimensions": [
    { "name": "Dimension Name", "description": "What this dimension covers" }
  ]
}

Rules:
- Dimensions should be specific to the topic, not generic
- Each dimension should be independently assessable
- Cover both foundational and advanced aspects
- 3 dimensions for narrow topics, up to 6 for broad ones`,
      },
      {
        role: "user",
        content: `Topic: ${topic.title}\nGoal: ${topic.goal || "General proficiency"}\nBackground: ${topic.background || "None provided"}`,
      },
    ], { temperature: 0.3 });

    const parsed = parseJsonFromAI(result.content) as {
      dimensions: Array<{ name: string; description: string }>;
    };

    return { success: true, data: { dimensions: parsed.dimensions } };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("generateDimensions error:", errMsg);
    return { success: false, error: `Assessment error: ${errMsg}` };
  }
}

// ---------------------------------------------------------------------------
// T9: Generate Assessment Question
// ---------------------------------------------------------------------------

export async function generateAssessmentQuestion(
  topicId: string,
  dimension: string,
  difficulty: "easy" | "medium" | "hard",
  previousQuestions: string[]
): Promise<ActionResult<{
  question: string;
  type: "mc" | "open_ended";
  options?: string[];
  correctAnswer: string;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title, goal")
      .eq("id", topicId)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    const config = await getConfigForTask("assessment");

    const result = await chatCompletion(config, [
      {
        role: "system",
        content: `You are an expert assessor creating a ${difficulty} diagnostic question for the dimension "${dimension}" of "${topic.title}".

Return a JSON object:
{
  "question": "The question text",
  "type": "mc" or "open_ended",
  "options": ["A", "B", "C", "D", "I don't know"],
  "correctAnswer": "The correct option letter or model answer"
}

Rules:
- For MC questions, ALWAYS include "I don't know" as the last option
- ${difficulty === "easy" ? "Test basic recall and recognition" : difficulty === "medium" ? "Test understanding and application" : "Test analysis and evaluation"}
- Do NOT repeat or closely overlap with these previous questions: ${previousQuestions.join("; ") || "none yet"}
- MC questions should have exactly 4 content options plus "I don't know"
- Alternate between MC and open_ended based on difficulty: easy=MC, medium=mix, hard=open_ended preferred
- Use plain text in options and questions. Do NOT use HTML entities (write <ul> not &lt;ul&gt;)`,
      },
      {
        role: "user",
        content: `Create a ${difficulty} question about "${dimension}" for someone learning "${topic.title}" with the goal: "${topic.goal || "General proficiency"}"`,
      },
    ], { temperature: 0.5 });

    const parsed = parseJsonFromAI(result.content) as {
      question: string;
      type: "mc" | "open_ended";
      options?: string[];
      correctAnswer: string;
    };

    return { success: true, data: parsed };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("generateAssessmentQuestion error:", errMsg);
    return { success: false, error: `Question error: ${errMsg}` };
  }
}

// ---------------------------------------------------------------------------
// T9: Evaluate Assessment Answer
// ---------------------------------------------------------------------------

export async function evaluateAssessmentAnswer(
  topicId: string,
  question: string,
  answer: string,
  correctAnswer: string,
  questionType: "mc" | "open_ended"
): Promise<ActionResult<{
  signal: "strong" | "adequate" | "weak";
  feedback: string;
  needsFollowUp: boolean;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const sanitizedAnswer = sanitizeInput(answer.trim());

    // Handle "I don't know" — clear weak signal, no need for AI eval
    if (sanitizedAnswer.toLowerCase() === "i don't know" || sanitizedAnswer === "") {
      return {
        success: true,
        data: { signal: "weak", feedback: "No answer provided.", needsFollowUp: false },
      };
    }

    // Handle "Narrowed to 2" MC answer
    if (sanitizedAnswer.toLowerCase().includes("narrowed to 2")) {
      return {
        success: true,
        data: { signal: "adequate", feedback: "Partial knowledge demonstrated.", needsFollowUp: false },
      };
    }

    const config = await getConfigForTask("grading");

    const result = await chatCompletion(config, [
      {
        role: "system",
        content: `You are evaluating an assessment answer to gauge a learner's current level.

Question: ${question}
Correct Answer: ${correctAnswer}
Question Type: ${questionType}

Return a JSON object:
{
  "signal": "strong" | "adequate" | "weak",
  "feedback": "Brief explanation of the assessment",
  "needsFollowUp": true/false
}

Rules:
- "strong" = clearly understands the concept, could explain to others
- "adequate" = gets the basics right but may miss nuances
- "weak" = fundamental misunderstanding or major gaps
- Set needsFollowUp to true if the answer was correct on MC but you suspect guessing (MC-strong validation)
- For open_ended, needsFollowUp is always false`,
      },
      {
        role: "user",
        content: `The learner answered: "${sanitizedAnswer}"`,
      },
    ], { temperature: 0.2 });

    const parsed = parseJsonFromAI(result.content) as {
      signal: "strong" | "adequate" | "weak";
      feedback: string;
      needsFollowUp: boolean;
    };

    return { success: true, data: parsed };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("evaluateAssessmentAnswer error:", errMsg);
    return { success: false, error: `Evaluation error: ${errMsg}` };
  }
}

// ---------------------------------------------------------------------------
// T9: Finalize Baseline Assessment
// ---------------------------------------------------------------------------

export async function finalizeBaseline(
  topicId: string,
  dimensionResults: Array<{
    name: string;
    signal: "strong" | "adequate" | "weak";
    evidence: string;
  }>
): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Calculate baseline scores from signals
    const signalScores: Record<string, number> = { strong: 1.0, adequate: 0.5, weak: 0.0 };
    const baselineScores: Record<string, number> = {};
    for (const dim of dimensionResults) {
      baselineScores[dim.name] = signalScores[dim.signal] ?? 0;
    }

    // Update learner profile
    const { error: profileError } = await supabase
      .from("learner_profiles")
      .update({
        dimensions: dimensionResults,
        baseline_scores: baselineScores,
      })
      .eq("topic_id", topicId);

    if (profileError) {
      console.error("Failed to update learner profile:", profileError.message);
      return { success: false, error: "Failed to save assessment results." };
    }

    // Transition topic to assessing (ready for curriculum generation)
    const { error: topicError } = await supabase
      .from("topics")
      .update({ status: "assessing" })
      .eq("id", topicId);

    if (topicError) {
      console.error("Failed to update topic status:", topicError.message);
    }

    return { success: true, data: null };
  } catch (err) {
    console.error("finalizeBaseline error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// T10: Generate Curriculum
// ---------------------------------------------------------------------------

export async function generateCurriculum(topicId: string): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title, goal, background")
      .eq("id", topicId)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    const { data: learnerProfile } = await supabase
      .from("learner_profiles")
      .select("dimensions, depth, baseline_scores")
      .eq("topic_id", topicId)
      .single();

    const config = await getConfigForTask("curriculum");

    const prompt = curriculumArchitectSystemPrompt({
      topic: topic.title,
      goal: topic.goal || "General proficiency",
      dimensions: JSON.stringify(learnerProfile?.dimensions || []),
      depth: learnerProfile?.depth || "standard",
      baselineScores: JSON.stringify(learnerProfile?.baseline_scores || {}),
    });

    const result = await chatCompletion(config, [
      { role: "system", content: prompt },
      {
        role: "user",
        content: `Generate a complete curriculum for "${topic.title}" following backwards design from the terminal goal. Enforce Bloom's progression and max 4 concepts per lesson. Ensure each module has 2-5 lessons.\n\nAlso classify the overall topic into one of these types: language, math, science, humanities, creative, technical, physical.\n\nReturn JSON with a "topicType" field at the top level.`,
      },
    ], { temperature: 0.4, maxTokens: 4000 });

    const parsed = parseJsonFromAI(result.content) as {
      topicType?: string;
      modules: Array<{
        title: string;
        description: string;
        bloomLevel: string;
        sequenceOrder: number;
        lessons: Array<{ title: string; sequenceOrder: number }>;
      }>;
    };

    // Derive topic type (with fallback)
    const validTopicTypes = ["language", "math", "science", "humanities", "creative", "technical", "physical"];
    const topicType = validTopicTypes.includes(parsed.topicType || "")
      ? parsed.topicType!
      : "technical";

    // Insert modules and lessons into DB
    for (const mod of parsed.modules) {
      const { data: insertedModule, error: modError } = await supabase
        .from("modules")
        .insert({
          topic_id: topicId,
          title: mod.title,
          description: mod.description,
          sequence_order: mod.sequenceOrder,
          bloom_level: mod.bloomLevel,
          status: mod.sequenceOrder === 1 ? "active" : "locked",
        })
        .select("id")
        .single();

      if (modError || !insertedModule) {
        console.error("Failed to insert module:", modError?.message);
        continue;
      }

      for (const lesson of mod.lessons) {
        const { error: lessonError } = await supabase
          .from("lessons")
          .insert({
            module_id: insertedModule.id,
            title: lesson.title,
            sequence_order: lesson.sequenceOrder,
            topic_type: topicType,
            status: "pending",
          });

        if (lessonError) {
          console.error("Failed to insert lesson:", lessonError.message);
        }
      }
    }

    // Transition topic to active
    await supabase
      .from("topics")
      .update({ status: "active" })
      .eq("id", topicId);

    return { success: true, data: null };
  } catch (err) {
    console.error("generateCurriculum error:", err);
    return { success: false, error: "Failed to generate curriculum." };
  }
}

// ---------------------------------------------------------------------------
// T11: Generate Lesson Content
// ---------------------------------------------------------------------------

export async function generateLesson(lessonId: string): Promise<ActionResult<{
  content: {
    objective: string;
    whyItMatters: string;
    material: string;
    keyTakeaways: string[];
    workedExample: { problem: string; solution: string; explanation: string };
    practiceQuestions: Array<{
      type: "mc" | "open_ended" | "worked_problem";
      question: string;
      options?: string[];
      correctAnswer: string;
      explanation: string;
    }>;
  };
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Get lesson with module and topic context
    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, sequence_order, module_id")
      .eq("id", lessonId)
      .single();

    if (!lesson) return { success: false, error: "Lesson not found." };

    const { data: module } = await supabase
      .from("modules")
      .select("id, title, bloom_level, topic_id, description")
      .eq("id", lesson.module_id)
      .single();

    if (!module) return { success: false, error: "Module not found." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title, goal")
      .eq("id", module.topic_id)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    // Get learner profile for context
    const { data: learnerProfile } = await supabase
      .from("learner_profiles")
      .select("dimensions, baseline_scores")
      .eq("topic_id", module.topic_id)
      .single();

    // Get previous lessons in this module for context
    const { data: previousLessons } = await supabase
      .from("lessons")
      .select("title, status")
      .eq("module_id", lesson.module_id)
      .lt("sequence_order", lesson.sequence_order)
      .order("sequence_order", { ascending: true });

    const config = await getConfigForTask("lesson");

    const prompt = lessonAuthorSystemPrompt({
      topic: topic.title,
      moduleName: module.title || "Module",
      lessonTitle: lesson.title || "Lesson",
      bloomLevel: module.bloom_level || "understand",
      previousLessons: (previousLessons || []).map(l => l.title).join(", ") || "None",
      learnerLevel: JSON.stringify(learnerProfile?.baseline_scores || {}),
    });

    const result = await chatCompletion(config, [
      {
        role: "system",
        content: prompt + `\n\nCRITICAL: Your lesson MUST follow this EXACT template:
1. objective — One sentence
2. whyItMatters — Why this connects to their goal: "${topic.goal || "General proficiency"}"
3. material — Core teaching content (200-400 words, plain text with minimal markdown). Keep it concise. NO code blocks longer than 5 lines.
4. keyTakeaways — 2-3 bullet points
5. workedExample — {problem, solution, explanation} — keep each field under 100 words
6. practiceQuestions — 3 questions, mix of MC/open-ended

For MC questions, ALWAYS include "I don't know" as the last option.
Max 3 concepts in the material. Be CONCISE — quality over length.

IMPORTANT: Keep total response under 2000 tokens. Brevity is critical.

Return as JSON:
{
  "objective": "...",
  "whyItMatters": "...",
  "material": "...",
  "keyTakeaways": ["..."],
  "workedExample": {"problem":"...","solution":"...","explanation":"..."},
  "practiceQuestions": [{"type":"mc|open_ended","question":"...","options":["A","B","C","D","I don't know"],"correctAnswer":"...","explanation":"..."}]
}`,
      },
      {
        role: "user",
        content: `Write the lesson "${lesson.title}" for module "${module.title}" in topic "${topic.title}".`,
      },
    ], { temperature: 0.5, maxTokens: 16000 });

    // Check if response was truncated
    if (result.finishReason === "length") {
      console.error("Lesson response truncated — model hit token limit. Content length:", result.content.length);
      return { success: false, error: "Lesson generation was too long. Please try again." };
    }

    const parsed = parseJsonFromAI(result.content) as {
      objective: string;
      whyItMatters: string;
      material: string;
      keyTakeaways: string[];
      workedExample: { problem: string; solution: string; explanation: string };
      practiceQuestions: Array<{
        type: "mc" | "open_ended" | "worked_problem";
        question: string;
        options?: string[];
        correctAnswer: string;
        explanation: string;
      }>;
    };

    // Store the lesson content
    const { error: updateError } = await supabase
      .from("lessons")
      .update({
        content: parsed,
        status: "in_progress",
      })
      .eq("id", lessonId);

    if (updateError) {
      console.error("Failed to store lesson content:", updateError.message);
      return { success: false, error: "Failed to save lesson." };
    }

    return { success: true, data: { content: parsed } };
  } catch (err) {
    const errMsg = err instanceof Error ? err.message : String(err);
    console.error("generateLesson error:", errMsg);
    return { success: false, error: `Lesson error: ${errMsg}` };
  }
}

// ---------------------------------------------------------------------------
// T11: Stream Lesson Content (API route helper)
// ---------------------------------------------------------------------------

export async function streamLessonContent(lessonId: string): Promise<ReadableStream<string> | null> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, sequence_order, module_id")
      .eq("id", lessonId)
      .single();

    if (!lesson) return null;

    const { data: module } = await supabase
      .from("modules")
      .select("id, title, bloom_level, topic_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) return null;

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title, goal")
      .eq("id", module.topic_id)
      .single();

    if (!topic) return null;

    const { data: learnerProfile } = await supabase
      .from("learner_profiles")
      .select("dimensions, baseline_scores")
      .eq("topic_id", module.topic_id)
      .single();

    const { data: previousLessons } = await supabase
      .from("lessons")
      .select("title")
      .eq("module_id", lesson.module_id)
      .lt("sequence_order", lesson.sequence_order)
      .order("sequence_order", { ascending: true });

    const config = await getConfigForTask("lesson");

    const prompt = lessonAuthorSystemPrompt({
      topic: topic.title,
      moduleName: module.title || "Module",
      lessonTitle: lesson.title || "Lesson",
      bloomLevel: module.bloom_level || "understand",
      previousLessons: (previousLessons || []).map(l => l.title).join(", ") || "None",
      learnerLevel: JSON.stringify(learnerProfile?.baseline_scores || {}),
    });

    return chatCompletionStream(config, [
      {
        role: "system",
        content: prompt + `\n\nWrite the lesson content in markdown format following this template:
## Objective
[One sentence]

## Why This Matters
[Connection to their goal: "${topic.goal || "General proficiency"}"]

## Core Material
[300-800 words, max 4 concepts]

## Key Takeaways
- [2-4 bullet points]

## Worked Example
**Problem:** [problem]
**Solution:** [step-by-step]
**Why it works:** [explanation]

Do NOT include practice questions in this streaming output — they will be generated separately.`,
      },
      {
        role: "user",
        content: `Write the lesson "${lesson.title}" for module "${module.title}".`,
      },
    ], { temperature: 0.5, maxTokens: 3000 });
  } catch (err) {
    console.error("streamLessonContent error:", err);
    return null;
  }
}

// ---------------------------------------------------------------------------
// T11: Complete Lesson
// ---------------------------------------------------------------------------

export async function completeLesson(
  lessonId: string,
  difficultyPulse: "easy" | "right" | "hard"
): Promise<ActionResult<{ nextLessonId: string | null; triggerMasteryTest: boolean; moduleId: string }>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Mark lesson completed
    const { data: lesson, error: lessonError } = await supabase
      .from("lessons")
      .update({
        status: "completed",
        difficulty_pulse: difficultyPulse,
        completed_at: new Date().toISOString(),
      })
      .eq("id", lessonId)
      .select("id, module_id, sequence_order")
      .single();

    if (lessonError || !lesson) {
      return { success: false, error: "Failed to complete lesson." };
    }

    // Get module info
    const { data: module } = await supabase
      .from("modules")
      .select("id, topic_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) return { success: false, error: "Module not found." };

    // Log difficulty pulse to feedback_log
    await supabase.from("feedback_log").insert({
      topic_id: module.topic_id,
      lesson_id: lessonId,
      module_id: lesson.module_id,
      type: "difficulty_pulse",
      data: { pulse: difficultyPulse },
    });

    // Check if this was the last lesson in the module
    const { data: allLessons } = await supabase
      .from("lessons")
      .select("id, status")
      .eq("module_id", lesson.module_id);

    const allCompleted = allLessons?.every(l => l.status === "completed") ?? false;

    if (allCompleted) {
      // Trigger mastery test
      return {
        success: true,
        data: {
          nextLessonId: null,
          triggerMasteryTest: true,
          moduleId: lesson.module_id,
        },
      };
    }

    // Find next lesson
    const { data: nextLesson } = await supabase
      .from("lessons")
      .select("id")
      .eq("module_id", lesson.module_id)
      .eq("status", "pending")
      .order("sequence_order", { ascending: true })
      .limit(1)
      .single();

    return {
      success: true,
      data: {
        nextLessonId: nextLesson?.id || null,
        triggerMasteryTest: false,
        moduleId: lesson.module_id,
      },
    };
  } catch (err) {
    console.error("completeLesson error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// T12: Grade Answer
// ---------------------------------------------------------------------------

export async function gradeAnswer(data: {
  lessonId: string;
  questionIndex: number;
  questionType: "mc" | "open_ended" | "worked_problem";
  question: string;
  userAnswer: string;
  correctAnswer: string;
  lessonObjective: string;
  topicTitle: string;
}): Promise<ActionResult<{
  grade: string;
  feedback: string;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const sanitizedAnswer = sanitizeInput(data.userAnswer.trim());

    // Handle "I don't know" for MC
    if (sanitizedAnswer.toLowerCase() === "i don't know" || sanitizedAnswer === "") {
      const result = {
        grade: data.questionType === "mc" ? "incorrect" : "needs_work",
        feedback: "No answer provided. Review the material and try again.",
      };

      await supabase.from("practice_responses").insert({
        lesson_id: data.lessonId,
        question_index: data.questionIndex,
        question_type: data.questionType,
        user_answer: sanitizedAnswer || "I don't know",
        grade: result.grade,
        feedback: result.feedback,
      });

      return { success: true, data: result };
    }

    // For MC, check directly first
    if (data.questionType === "mc") {
      const isCorrect = sanitizedAnswer.trim().toLowerCase() === data.correctAnswer.trim().toLowerCase();
      const grade = isCorrect ? "correct" : "incorrect";
      const feedback = isCorrect
        ? "Correct!"
        : `The correct answer is: ${data.correctAnswer}`;

      await supabase.from("practice_responses").insert({
        lesson_id: data.lessonId,
        question_index: data.questionIndex,
        question_type: data.questionType,
        user_answer: sanitizedAnswer,
        grade,
        feedback,
      });

      return { success: true, data: { grade, feedback } };
    }

    // For open-ended and worked problems, use AI grading
    const config = await getConfigForTask("grading");

    const assessorPrompt = assessorSystemPrompt({
      topic: data.topicTitle,
      lessonObjective: data.lessonObjective,
      questionType: data.questionType,
    });

    const aiResult = await chatCompletion(config, [
      { role: "system", content: assessorPrompt },
      {
        role: "user",
        content: `Question: ${data.question}\nCorrect Answer: ${data.correctAnswer}\nLearner's Answer: ${sanitizedAnswer}`,
      },
    ], { temperature: 0.2 });

    const parsed = parseJsonFromAI(aiResult.content) as {
      grade: string;
      feedback: string;
    };

    await supabase.from("practice_responses").insert({
      lesson_id: data.lessonId,
      question_index: data.questionIndex,
      question_type: data.questionType,
      user_answer: sanitizedAnswer,
      grade: parsed.grade,
      feedback: parsed.feedback,
    });

    return { success: true, data: parsed };
  } catch (err) {
    console.error("gradeAnswer error:", err);
    return { success: false, error: "Failed to grade answer." };
  }
}

// ---------------------------------------------------------------------------
// T13: Extract Concepts for SRS
// ---------------------------------------------------------------------------

export async function extractConcepts(lessonId: string): Promise<ActionResult<{
  concepts: Array<{ concept: string; reviewPrompt: string }>;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: lesson } = await supabase
      .from("lessons")
      .select("id, title, content, module_id")
      .eq("id", lessonId)
      .single();

    if (!lesson || !lesson.content) {
      return { success: false, error: "Lesson not found or has no content." };
    }

    const { data: module } = await supabase
      .from("modules")
      .select("topic_id")
      .eq("id", lesson.module_id)
      .single();

    if (!module) return { success: false, error: "Module not found." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title")
      .eq("id", module.topic_id)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    const content = lesson.content as Record<string, unknown>;
    const contentStr = `${content.objective || ""}\n${content.material || ""}\n${(content.keyTakeaways as string[] || []).join("\n")}`;

    const config = await getConfigForTask("srs_extraction");

    const prompt = srsExtractorSystemPrompt({
      topic: topic.title,
      lessonTitle: lesson.title || "Lesson",
      lessonContent: contentStr.substring(0, 3000), // Limit token usage
    });

    const result = await chatCompletion(config, [
      { role: "system", content: prompt },
      { role: "user", content: "Extract the key concepts for spaced repetition review." },
    ], { temperature: 0.3 });

    const parsed = parseJsonFromAI(result.content) as {
      concepts: Array<{
        concept: string;
        importance: string;
        reviewPrompt: string;
      }>;
    };

    // Create SRS cards for each concept
    const now = new Date();
    const tomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    for (const concept of parsed.concepts) {
      await supabase.from("srs_cards").insert({
        topic_id: topic.id,
        concept: `${concept.concept}\n---\n${concept.reviewPrompt}`,
        source_lesson_id: lessonId,
        ease_factor: 2.5,
        interval_days: 1,
        repetitions: 0,
        next_review_at: tomorrow.toISOString(),
      });
    }

    return {
      success: true,
      data: { concepts: parsed.concepts.map(c => ({ concept: c.concept, reviewPrompt: c.reviewPrompt })) },
    };
  } catch (err) {
    console.error("extractConcepts error:", err);
    return { success: false, error: "Failed to extract concepts." };
  }
}

// ---------------------------------------------------------------------------
// T13: Get Due Reviews
// ---------------------------------------------------------------------------

export async function getDueReviews(topicId: string): Promise<ActionResult<{
  cards: Array<{
    id: string;
    concept: string;
    ease_factor: number;
    interval_days: number;
    repetitions: number;
  }>;
  count: number;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: cards } = await supabase
      .from("srs_cards")
      .select("id, concept, ease_factor, interval_days, repetitions, next_review_at")
      .eq("topic_id", topicId)
      .lte("next_review_at", new Date().toISOString())
      .order("next_review_at", { ascending: true });

    return {
      success: true,
      data: {
        cards: cards || [],
        count: cards?.length || 0,
      },
    };
  } catch (err) {
    console.error("getDueReviews error:", err);
    return { success: false, error: "Failed to get due reviews." };
  }
}

// ---------------------------------------------------------------------------
// T13: Update SRS Card after review
// ---------------------------------------------------------------------------

export async function reviewSrsCard(
  cardId: string,
  grade: number // 0-5 SM-2 scale
): Promise<ActionResult<null>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    // Import SRS calculation (dynamic to avoid circular deps)
    const { calculateNextReview } = await import("@/lib/srs");

    const { data: card } = await supabase
      .from("srs_cards")
      .select("id, ease_factor, interval_days, repetitions")
      .eq("id", cardId)
      .single();

    if (!card) return { success: false, error: "Card not found." };

    const updated = calculateNextReview(
      {
        easeFactor: card.ease_factor,
        intervalDays: card.interval_days,
        repetitions: card.repetitions,
      },
      grade
    );

    const now = new Date();
    const nextReview = new Date(now.getTime() + updated.intervalDays * 24 * 60 * 60 * 1000);

    const { error } = await supabase
      .from("srs_cards")
      .update({
        ease_factor: updated.easeFactor,
        interval_days: updated.intervalDays,
        repetitions: updated.repetitions,
        next_review_at: nextReview.toISOString(),
        last_reviewed_at: now.toISOString(),
      })
      .eq("id", cardId);

    if (error) {
      console.error("Failed to update SRS card:", error.message);
      return { success: false, error: "Failed to update review." };
    }

    return { success: true, data: null };
  } catch (err) {
    console.error("reviewSrsCard error:", err);
    return { success: false, error: "Something went wrong." };
  }
}

// ---------------------------------------------------------------------------
// T14: Generate Mastery Test
// ---------------------------------------------------------------------------

export async function generateMasteryTest(moduleId: string): Promise<ActionResult<{
  testId: string;
  questions: Array<{
    type: "mc" | "open_ended";
    question: string;
    options?: string[];
    correctAnswer: string;
    area: string;
  }>;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const { data: module } = await supabase
      .from("modules")
      .select("id, title, description, topic_id, bloom_level")
      .eq("id", moduleId)
      .single();

    if (!module) return { success: false, error: "Module not found." };

    const { data: topic } = await supabase
      .from("topics")
      .select("id, title")
      .eq("id", module.topic_id)
      .single();

    if (!topic) return { success: false, error: "Topic not found." };

    // Get all lessons in the module for content context
    const { data: lessons } = await supabase
      .from("lessons")
      .select("title, content")
      .eq("module_id", moduleId)
      .eq("status", "completed")
      .order("sequence_order", { ascending: true });

    const lessonSummaries = (lessons || [])
      .map(l => {
        const content = l.content as Record<string, unknown> | null;
        return `${l.title}: ${content?.objective || ""}`;
      })
      .join("\n");

    // Check if this is a reteach attempt
    const { data: previousTests } = await supabase
      .from("mastery_tests")
      .select("id, passed, is_reteach")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    const isReteach = previousTests?.some(t => t.passed === false) ?? false;
    const passNumber = (previousTests?.length || 0) + 1;

    const config = await getConfigForTask("grading");

    const result = await chatCompletion(config, [
      {
        role: "system",
        content: `You are creating a mastery test for the module "${module.title}" in topic "${topic.title}".
Bloom's level: ${module.bloom_level}
${isReteach ? "This is a RETEACH attempt. Use DIFFERENT angles and examples from previous tests." : ""}

Generate a test with 5-8 questions covering all concepts in this module.
Mix MC and open-ended questions (aim for roughly 60/40 split).
Each question must map to a specific area/concept.

For MC questions, include "I don't know" as the last option.

Lesson objectives covered:
${lessonSummaries}

Return a JSON object:
{
  "questions": [
    {
      "type": "mc" | "open_ended",
      "question": "...",
      "options": ["A","B","C","D","I don't know"],
      "correctAnswer": "...",
      "area": "The concept/area this tests"
    }
  ]
}`,
      },
      { role: "user", content: "Generate the mastery test now." },
    ], { temperature: 0.4, maxTokens: 3000 });

    const parsed = parseJsonFromAI(result.content) as {
      questions: Array<{
        type: "mc" | "open_ended";
        question: string;
        options?: string[];
        correctAnswer: string;
        area: string;
      }>;
    };

    // Create mastery test record
    const { data: test, error: testError } = await supabase
      .from("mastery_tests")
      .insert({
        module_id: moduleId,
        pass_number: passNumber,
        is_reteach: isReteach,
      })
      .select("id")
      .single();

    if (testError || !test) {
      return { success: false, error: "Failed to create mastery test." };
    }

    return {
      success: true,
      data: { testId: test.id, questions: parsed.questions },
    };
  } catch (err) {
    console.error("generateMasteryTest error:", err);
    return { success: false, error: "Failed to generate mastery test." };
  }
}

// ---------------------------------------------------------------------------
// T14: Evaluate Mastery Test
// ---------------------------------------------------------------------------

export async function evaluateMasteryTest(
  testId: string,
  moduleId: string,
  answers: Array<{
    questionIndex: number;
    question: string;
    type: "mc" | "open_ended";
    userAnswer: string;
    correctAnswer: string;
    area: string;
  }>
): Promise<ActionResult<{
  score: number;
  passed: boolean;
  areaScores: Record<string, number>;
  status: "mastery_pending" | "mastered" | "reteach" | "skipped_gap";
  message: string;
}>> {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { success: false, error: "Not authenticated." };

    const config = await getConfigForTask("grading");

    // Grade each answer
    const areaScores: Record<string, number[]> = {};
    let totalCorrect = 0;

    for (const answer of answers) {
      const sanitizedAnswer = sanitizeInput(answer.userAnswer.trim());
      let isCorrect = false;

      if (answer.type === "mc") {
        isCorrect = sanitizedAnswer.toLowerCase() === answer.correctAnswer.toLowerCase();
      } else {
        // AI grade for open-ended
        const gradeResult = await chatCompletion(config, [
          {
            role: "system",
            content: `Grade this mastery test answer. Return JSON: {"correct": true/false, "score": 0.0-1.0}
Question: ${answer.question}
Correct Answer: ${answer.correctAnswer}`,
          },
          { role: "user", content: `Learner answered: "${sanitizedAnswer}"` },
        ], { temperature: 0.1 });

        const parsed = parseJsonFromAI(gradeResult.content) as { correct: boolean; score: number };
        isCorrect = parsed.score >= 0.7;
      }

      if (!areaScores[answer.area]) areaScores[answer.area] = [];
      areaScores[answer.area].push(isCorrect ? 1 : 0);
      if (isCorrect) totalCorrect++;
    }

    const overallScore = answers.length > 0 ? (totalCorrect / answers.length) * 100 : 0;
    const passed = overallScore >= 80;

    // Calculate per-area averages
    const areaAverages: Record<string, number> = {};
    for (const [area, scores] of Object.entries(areaScores)) {
      areaAverages[area] = (scores.reduce((a, b) => a + b, 0) / scores.length) * 100;
    }

    // Update mastery test record
    await supabase
      .from("mastery_tests")
      .update({
        score: overallScore,
        passed,
        area_scores: areaAverages,
      })
      .eq("id", testId);

    // Get module and check state
    const { data: module } = await supabase
      .from("modules")
      .select("id, status, mastery_score, mastery_confirmed_at, topic_id")
      .eq("id", moduleId)
      .single();

    if (!module) return { success: false, error: "Module not found." };

    // Check previous tests for reteach/circuit breaker logic
    const { data: previousTests } = await supabase
      .from("mastery_tests")
      .select("id, passed, is_reteach, score")
      .eq("module_id", moduleId)
      .order("created_at", { ascending: false });

    const reteachAttempts = previousTests?.filter(t => t.is_reteach).length || 0;

    let newStatus: "mastery_pending" | "mastered" | "reteach" | "skipped_gap";
    let message: string;

    if (passed) {
      if (module.status === "mastery_pending" && module.mastery_confirmed_at) {
        // Check if 1-day gap has passed for two-pass confirmation
        const firstPassTime = new Date(module.mastery_confirmed_at).getTime();
        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        if (now - firstPassTime >= oneDayMs) {
          // Two-pass confirmation: MASTERED
          newStatus = "mastered";
          message = "Congratulations! You have mastered this module.";

          await supabase
            .from("modules")
            .update({ status: "mastered", mastery_score: overallScore })
            .eq("id", moduleId);

          // Unlock next module
          const { data: nextModule } = await supabase
            .from("modules")
            .select("id")
            .eq("topic_id", module.topic_id)
            .eq("status", "locked")
            .order("sequence_order", { ascending: true })
            .limit(1)
            .single();

          if (nextModule) {
            await supabase
              .from("modules")
              .update({ status: "active" })
              .eq("id", nextModule.id);
          }
        } else {
          // Too soon for second pass
          newStatus = "mastery_pending";
          message = "Passed again, but the 1-day confirmation gap has not elapsed yet. Come back tomorrow to confirm mastery.";
        }
      } else {
        // First pass at 80%+: set mastery_pending
        newStatus = "mastery_pending";
        message = "Well done! Score: " + Math.round(overallScore) + "%. Come back in 24 hours for the confirmation test.";

        await supabase
          .from("modules")
          .update({
            status: "mastery_pending",
            mastery_score: overallScore,
            mastery_confirmed_at: new Date().toISOString(),
          })
          .eq("id", moduleId);
      }
    } else {
      // Failed
      if (reteachAttempts >= 1 && overallScore < 70) {
        // Circuit breaker: <70% after reteach
        newStatus = "skipped_gap";
        message = "This module has been marked as a gap. You can revisit it later. Moving on to the next module.";

        // Mark as reteach (which serves as "skipped" in our schema)
        await supabase
          .from("modules")
          .update({ status: "active", mastery_score: overallScore })
          .eq("id", moduleId);

        // Unlock next module anyway
        const { data: nextModule } = await supabase
          .from("modules")
          .select("id")
          .eq("topic_id", module.topic_id)
          .eq("status", "locked")
          .order("sequence_order", { ascending: true })
          .limit(1)
          .single();

        if (nextModule) {
          await supabase
            .from("modules")
            .update({ status: "active" })
            .eq("id", nextModule.id);
        }
      } else {
        // Trigger reteach (max 1 cycle)
        newStatus = "reteach";
        message = "Score: " + Math.round(overallScore) + "%. Some areas need reinforcement. Review the weak areas and try again.";

        await supabase
          .from("modules")
          .update({ status: "reteach", mastery_score: overallScore })
          .eq("id", moduleId);
      }
    }

    // Log to feedback
    await supabase.from("feedback_log").insert({
      topic_id: module.topic_id,
      module_id: moduleId,
      type: "mastery_feedback",
      data: { score: overallScore, passed, areaScores: areaAverages, status: newStatus },
    });

    return {
      success: true,
      data: {
        score: overallScore,
        passed,
        areaScores: areaAverages,
        status: newStatus,
        message,
      },
    };
  } catch (err) {
    console.error("evaluateMasteryTest error:", err);
    return { success: false, error: "Failed to evaluate mastery test." };
  }
}
