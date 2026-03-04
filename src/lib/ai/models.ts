/**
 * Model Routing Configuration
 *
 * Maps task types to model tiers, and model tiers to provider-specific model IDs.
 * This is the single source of truth for which model handles which task.
 */

import type { ProviderName } from "./provider";

export type ModelTier = "sonnet" | "haiku";

export type TaskType =
  | "profiling"
  | "curriculum"
  | "lesson"
  | "grading"
  | "srs_extraction"
  | "resource_verification"
  | "assessment"
  | "adaptation";

/** Which model tier each task type requires */
export const TASK_MODEL_TIER: Record<TaskType, ModelTier> = {
  profiling: "sonnet",
  curriculum: "sonnet",
  lesson: "sonnet",
  assessment: "sonnet",
  adaptation: "sonnet",
  grading: "haiku",
  srs_extraction: "haiku",
  resource_verification: "haiku",
};

/**
 * Provider-specific model IDs for each tier.
 * Update these when providers add/deprecate models.
 */
export const PROVIDER_MODELS: Record<ProviderName, Record<ModelTier, string>> = {
  openrouter: {
    sonnet: "anthropic/claude-sonnet-4",
    haiku: "anthropic/claude-3.5-haiku",
  },
  venice: {
    sonnet: "anthropic/claude-sonnet-4",
    haiku: "anthropic/claude-3.5-haiku",
  },
};

/**
 * Resolve the concrete model ID for a given task and provider.
 */
export function getModelForTask(
  task: TaskType,
  provider: ProviderName
): string {
  const tier = TASK_MODEL_TIER[task];
  return PROVIDER_MODELS[provider][tier];
}

/**
 * Get the model tier for a task (useful for logging/billing without exposing model IDs).
 */
export function getTierForTask(task: TaskType): ModelTier {
  return TASK_MODEL_TIER[task];
}
