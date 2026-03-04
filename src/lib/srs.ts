/**
 * SM-2 Spaced Repetition Algorithm — Pure TypeScript
 *
 * No LLM calls. Pure math. This is the core of the SRS system.
 *
 * Grade scale (0-5):
 *   0 = complete blackout
 *   1 = wrong (no recall)
 *   2 = wrong but remembered after seeing answer
 *   3 = correct with significant difficulty
 *   4 = correct with some hesitation
 *   5 = perfect recall
 *
 * Interval progression:
 *   First correct: 1 day
 *   Second correct: 6 days
 *   Subsequent: interval * ease_factor
 *
 * Ease factor floor: 1.3
 * Mastered: interval >= 90 AND consecutive correct >= 5
 */

export type SrsCardState = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

export type SrsReviewResult = {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
};

/**
 * Calculate the next review state for an SRS card after a review.
 *
 * Implements the SM-2 algorithm exactly:
 * - If grade >= 3 (correct): increase interval based on repetition count
 * - If grade < 3 (incorrect): reset to beginning
 * - Always update ease factor
 */
export function calculateNextReview(
  card: SrsCardState,
  grade: number
): SrsReviewResult {
  // Clamp grade to valid range
  const g = Math.max(0, Math.min(5, Math.round(grade)));

  let { easeFactor, intervalDays, repetitions } = card;

  if (g >= 3) {
    // Correct response
    if (repetitions === 0) {
      intervalDays = 1;
    } else if (repetitions === 1) {
      intervalDays = 6;
    } else {
      intervalDays = Math.round(intervalDays * easeFactor);
    }
    repetitions += 1;
  } else {
    // Incorrect response — reset
    repetitions = 0;
    intervalDays = 1;
  }

  // Update ease factor using SM-2 formula
  // EF' = EF + (0.1 - (5 - grade) * (0.08 + (5 - grade) * 0.02))
  easeFactor = easeFactor + (0.1 - (5 - g) * (0.08 + (5 - g) * 0.02));

  // Enforce floor of 1.3
  easeFactor = Math.max(1.3, easeFactor);

  return {
    easeFactor: Math.round(easeFactor * 100) / 100, // Round to 2 decimal places
    intervalDays,
    repetitions,
  };
}

/**
 * Check if a card qualifies as "mastered".
 * Mastered = interval >= 90 days AND consecutive correct >= 5
 */
export function isMastered(card: SrsCardState): boolean {
  return card.intervalDays >= 90 && card.repetitions >= 5;
}

/**
 * Calculate the next review date from the current time and interval.
 */
export function getNextReviewDate(intervalDays: number, fromDate?: Date): Date {
  const from = fromDate || new Date();
  return new Date(from.getTime() + intervalDays * 24 * 60 * 60 * 1000);
}

/**
 * Map a user-friendly rating to the SM-2 grade scale.
 *
 * Used in the review UI where users pick from simpler options.
 */
export function mapRatingToGrade(
  rating: "blackout" | "wrong" | "hard" | "good" | "easy" | "perfect"
): number {
  const mapping: Record<string, number> = {
    blackout: 0,
    wrong: 1,
    hard: 3,
    good: 4,
    easy: 5,
    perfect: 5,
  };
  return mapping[rating] ?? 3;
}

/**
 * Determine priority for overdue cards.
 * Higher values = more urgent to review.
 * Considers how overdue the card is relative to its interval.
 */
export function calculateOverduePriority(
  nextReviewAt: Date,
  intervalDays: number,
  now?: Date
): number {
  const current = now || new Date();
  const overdueDays = (current.getTime() - nextReviewAt.getTime()) / (24 * 60 * 60 * 1000);

  if (overdueDays <= 0) return 0; // Not overdue

  // Priority = how many intervals overdue (capped at 10)
  return Math.min(10, overdueDays / Math.max(1, intervalDays));
}
