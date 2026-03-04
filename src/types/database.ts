/**
 * Database types matching the Supabase schema.
 * These mirror the migration SQL exactly.
 */

export type SubscriptionStatus = "free" | "active" | "canceled";
export type ApiProvider = "openrouter" | "venice" | null;
export type TopicStatus = "onboarding" | "assessing" | "active" | "completed";
export type ModuleStatus = "locked" | "active" | "mastery_pending" | "mastered" | "reteach";
export type LessonStatus = "pending" | "in_progress" | "completed";
export type BloomLevel = "remember" | "understand" | "apply" | "analyze" | "evaluate" | "create";
export type TopicType = "language" | "math" | "science" | "humanities" | "creative" | "technical" | "physical";
export type DifficultyPulse = "easy" | "right" | "hard";
export type QuestionType = "mc" | "open_ended" | "worked_problem";
export type MCGrade = "correct" | "incorrect";
export type OpenEndedGrade = "excellent" | "adequate" | "needs_work";
export type DimensionSignal = "strong" | "adequate" | "weak";
export type FeedbackType = "difficulty_pulse" | "mastery_feedback" | "general";

export type Profile = {
  id: string;
  display_name: string | null;
  timezone: string;
  api_provider: ApiProvider;
  encrypted_api_key: string | null;
  subscription_status: SubscriptionStatus;
  stripe_customer_id: string | null;
  created_at: string;
};

export type Topic = {
  id: string;
  user_id: string;
  title: string;
  goal: string | null;
  background: string | null;
  status: TopicStatus;
  created_at: string;
};

export type LearnerProfileDimension = {
  name: string;
  signal: DimensionSignal;
  evidence: string;
};

export type LearnerProfile = {
  id: string;
  topic_id: string;
  dimensions: LearnerProfileDimension[];
  depth: "quick" | "standard" | "thorough";
  baseline_scores: Record<string, number> | null;
  created_at: string;
};

export type Module = {
  id: string;
  topic_id: string;
  title: string | null;
  description: string | null;
  sequence_order: number;
  bloom_level: BloomLevel | null;
  status: ModuleStatus;
  mastery_score: number | null;
  mastery_confirmed_at: string | null;
  created_at: string;
};

export type LessonContent = {
  objective: string;
  material: string;
  takeaways: string[];
  example: string;
  practice: unknown[];
};

export type Lesson = {
  id: string;
  module_id: string;
  title: string | null;
  sequence_order: number;
  content: LessonContent | null;
  topic_type: TopicType | null;
  status: LessonStatus;
  difficulty_pulse: DifficultyPulse | null;
  completed_at: string | null;
  created_at: string;
};

export type PracticeResponse = {
  id: string;
  lesson_id: string;
  question_index: number;
  question_type: QuestionType;
  user_answer: string;
  grade: MCGrade | OpenEndedGrade | null;
  feedback: string | null;
  created_at: string;
};

export type SrsCard = {
  id: string;
  topic_id: string;
  concept: string;
  source_lesson_id: string | null;
  ease_factor: number;
  interval_days: number;
  repetitions: number;
  next_review_at: string | null;
  last_reviewed_at: string | null;
  created_at: string;
};

export type MasteryTest = {
  id: string;
  module_id: string;
  pass_number: number;
  score: number | null;
  passed: boolean | null;
  area_scores: Record<string, number> | null;
  is_reteach: boolean;
  created_at: string;
};

export type FeedbackLog = {
  id: string;
  topic_id: string;
  lesson_id: string | null;
  module_id: string | null;
  type: FeedbackType;
  data: Record<string, unknown>;
  created_at: string;
};
