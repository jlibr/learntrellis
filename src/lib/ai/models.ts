/**
 * Model Routing Configuration
 *
 * Maps each task type directly to an OpenRouter model ID.
 * This is the single source of truth for which model handles which task.
 *
 * Routing rationale (verified March 2026):
 * - Profiling/Curriculum: Gemini 2.5 Pro — strong reasoning, 55% cheaper than Sonnet
 * - Lesson delivery: Gemini 2.5 Flash — reliable JSON output, DeepSeek V3 was generating HTML instead of JSON
 * - Assessment: Gemini 2.5 Flash — better than Haiku, cheaper output pricing
 * - Grading: Gemini 2.5 Flash — outperforms Claude as LLM judge (JudgeBench)
 * - SRS extraction: GPT-5 Nano — dead simple pattern matching, cheapest option
 * - Resource verification: Gemini 2.5 Flash — factual checking at low cost
 * - Adaptation: Gemini 2.5 Flash — rules-based decisions with structured output
 */

import type { ProviderName } from "./provider";

export type TaskType =
  | "profiling"
  | "curriculum"
  | "lesson"
  | "grading"
  | "srs_extraction"
  | "resource_verification"
  | "assessment"
  | "adaptation";

/**
 * Per-task model routing for OpenRouter.
 * OpenRouter model IDs — all accessible through a single API key.
 */
const OPENROUTER_TASK_MODELS: Record<TaskType, string> = {
  profiling: "google/gemini-2.5-pro",
  curriculum: "google/gemini-2.5-pro",
  lesson: "google/gemini-2.5-flash",
  assessment: "google/gemini-2.5-flash",
  grading: "google/gemini-2.5-flash",
  srs_extraction: "openai/gpt-5-nano",
  resource_verification: "google/gemini-2.5-flash",
  adaptation: "google/gemini-2.5-flash",
};

/**
 * Venice has a smaller model catalog — fall back to best available.
 * Venice users accept that routing may be less optimized.
 */
const VENICE_TASK_MODELS: Record<TaskType, string> = {
  profiling: "anthropic/claude-sonnet-4",
  curriculum: "anthropic/claude-sonnet-4",
  lesson: "anthropic/claude-sonnet-4",
  assessment: "anthropic/claude-3.5-haiku",
  grading: "anthropic/claude-3.5-haiku",
  srs_extraction: "anthropic/claude-3.5-haiku",
  resource_verification: "anthropic/claude-3.5-haiku",
  adaptation: "anthropic/claude-3.5-haiku",
};

const PROVIDER_TASK_MODELS: Record<ProviderName, Record<TaskType, string>> = {
  openrouter: OPENROUTER_TASK_MODELS,
  venice: VENICE_TASK_MODELS,
};

/**
 * Resolve the concrete model ID for a given task and provider.
 */
export function getModelForTask(
  task: TaskType,
  provider: ProviderName
): string {
  return PROVIDER_TASK_MODELS[provider][task];
}

/**
 * Cost tier labels for logging/billing (not used for routing).
 */
export type CostTier = "premium" | "standard" | "budget";

const TASK_COST_TIER: Record<TaskType, CostTier> = {
  profiling: "premium",
  curriculum: "premium",
  lesson: "standard",
  assessment: "standard",
  grading: "budget",
  srs_extraction: "budget",
  resource_verification: "budget",
  adaptation: "standard",
};

export function getCostTierForTask(task: TaskType): CostTier {
  return TASK_COST_TIER[task];
}
