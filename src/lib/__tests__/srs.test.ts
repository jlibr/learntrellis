/**
 * SM-2 SRS Algorithm Tests
 *
 * Verifies the pure TypeScript SM-2 implementation against known-correct values.
 * Run with: npx jest src/lib/__tests__/srs.test.ts
 *        or: npx tsx --test src/lib/__tests__/srs.test.ts
 */

import {
  calculateNextReview,
  isMastered,
  getNextReviewDate,
  mapRatingToGrade,
  calculateOverduePriority,
  type SrsCardState,
} from "../srs";

// ---- Helper to create a fresh card ----
function freshCard(): SrsCardState {
  return { easeFactor: 2.5, intervalDays: 1, repetitions: 0 };
}

// ---- calculateNextReview ----

describe("calculateNextReview", () => {
  test("first correct response (grade 4): interval = 1 day", () => {
    const result = calculateNextReview(freshCard(), 4);
    expect(result.intervalDays).toBe(1);
    expect(result.repetitions).toBe(1);
    expect(result.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  test("second correct response (grade 4): interval = 6 days", () => {
    const afterFirst = calculateNextReview(freshCard(), 4);
    const result = calculateNextReview(afterFirst, 4);
    expect(result.intervalDays).toBe(6);
    expect(result.repetitions).toBe(2);
  });

  test("third correct response: interval = round(6 * EF)", () => {
    let card = freshCard();
    card = calculateNextReview(card, 4); // rep 0 -> 1, interval 1
    card = calculateNextReview(card, 4); // rep 1 -> 2, interval 6
    const result = calculateNextReview(card, 4); // rep 2 -> 3, interval = round(6 * EF)
    expect(result.intervalDays).toBe(Math.round(6 * card.easeFactor));
    expect(result.repetitions).toBe(3);
  });

  test("incorrect response (grade 1): resets repetitions and interval to 1", () => {
    let card = freshCard();
    card = calculateNextReview(card, 5); // rep 0->1
    card = calculateNextReview(card, 5); // rep 1->2
    card = calculateNextReview(card, 5); // rep 2->3
    const result = calculateNextReview(card, 1); // FAIL
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  test("grade 0 (blackout): resets like any incorrect", () => {
    const card: SrsCardState = { easeFactor: 2.5, intervalDays: 30, repetitions: 5 };
    const result = calculateNextReview(card, 0);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  test("grade 2 (wrong but remembered): still counts as incorrect", () => {
    const card: SrsCardState = { easeFactor: 2.5, intervalDays: 10, repetitions: 3 };
    const result = calculateNextReview(card, 2);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  test("grade 3 (correct with difficulty): counts as correct", () => {
    const result = calculateNextReview(freshCard(), 3);
    expect(result.repetitions).toBe(1);
    expect(result.intervalDays).toBe(1);
  });

  test("ease factor never drops below 1.3", () => {
    let card = freshCard();
    // Multiple grade-0 reviews should push EF down but never below 1.3
    for (let i = 0; i < 10; i++) {
      card = calculateNextReview(card, 0);
    }
    expect(card.easeFactor).toBe(1.3);
  });

  test("perfect responses (grade 5) increase ease factor", () => {
    const card = freshCard();
    const result = calculateNextReview(card, 5);
    expect(result.easeFactor).toBeGreaterThan(2.5);
  });

  test("grade 5 ease factor calculation is exact: EF + 0.1", () => {
    const result = calculateNextReview(freshCard(), 5);
    // EF' = 2.5 + (0.1 - (5-5)*(0.08 + (5-5)*0.02)) = 2.5 + 0.1 = 2.6
    expect(result.easeFactor).toBe(2.6);
  });

  test("grade 4 ease factor calculation: EF + 0.0", () => {
    const result = calculateNextReview(freshCard(), 4);
    // EF' = 2.5 + (0.1 - (5-4)*(0.08 + (5-4)*0.02)) = 2.5 + (0.1 - 1*0.10) = 2.5 + 0.0 = 2.5
    expect(result.easeFactor).toBe(2.5);
  });

  test("grade 3 ease factor calculation: EF - 0.14", () => {
    const result = calculateNextReview(freshCard(), 3);
    // EF' = 2.5 + (0.1 - (5-3)*(0.08 + (5-3)*0.02)) = 2.5 + (0.1 - 2*0.12) = 2.5 - 0.14 = 2.36
    expect(result.easeFactor).toBe(2.36);
  });

  test("grade clamping: grade > 5 is treated as 5", () => {
    const result = calculateNextReview(freshCard(), 7);
    expect(result.easeFactor).toBe(2.6);
    expect(result.repetitions).toBe(1);
  });

  test("grade clamping: negative grade is treated as 0", () => {
    const result = calculateNextReview(freshCard(), -3);
    expect(result.repetitions).toBe(0);
    expect(result.intervalDays).toBe(1);
  });

  test("long progression: 10 perfect reviews", () => {
    let card = freshCard();
    for (let i = 0; i < 10; i++) {
      card = calculateNextReview(card, 5);
    }
    // After 10 perfect reviews, interval should be substantial
    expect(card.intervalDays).toBeGreaterThan(60);
    expect(card.repetitions).toBe(10);
    expect(card.easeFactor).toBeGreaterThan(2.5);
  });

  test("mixed performance: correct then incorrect then recovery", () => {
    let card = freshCard();
    card = calculateNextReview(card, 5); // Pass
    card = calculateNextReview(card, 5); // Pass
    card = calculateNextReview(card, 1); // Fail -> reset
    expect(card.repetitions).toBe(0);
    expect(card.intervalDays).toBe(1);

    card = calculateNextReview(card, 4); // Recover
    expect(card.repetitions).toBe(1);
    expect(card.intervalDays).toBe(1);
  });
});

// ---- isMastered ----

describe("isMastered", () => {
  test("returns false for fresh card", () => {
    expect(isMastered(freshCard())).toBe(false);
  });

  test("returns false if interval < 90 even with 5+ reps", () => {
    expect(isMastered({ easeFactor: 2.5, intervalDays: 89, repetitions: 10 })).toBe(false);
  });

  test("returns false if reps < 5 even with 90+ interval", () => {
    expect(isMastered({ easeFactor: 2.5, intervalDays: 100, repetitions: 4 })).toBe(false);
  });

  test("returns true when both conditions met", () => {
    expect(isMastered({ easeFactor: 2.5, intervalDays: 90, repetitions: 5 })).toBe(true);
  });

  test("returns true for highly mastered card", () => {
    expect(isMastered({ easeFactor: 3.0, intervalDays: 365, repetitions: 20 })).toBe(true);
  });
});

// ---- getNextReviewDate ----

describe("getNextReviewDate", () => {
  test("returns date 1 day from now for interval = 1", () => {
    const from = new Date("2025-01-01T12:00:00Z");
    const next = getNextReviewDate(1, from);
    expect(next.toISOString()).toBe("2025-01-02T12:00:00.000Z");
  });

  test("returns date 6 days from now for interval = 6", () => {
    const from = new Date("2025-01-01T12:00:00Z");
    const next = getNextReviewDate(6, from);
    expect(next.toISOString()).toBe("2025-01-07T12:00:00.000Z");
  });

  test("returns date 90 days from now for interval = 90", () => {
    const from = new Date("2025-01-01T00:00:00Z");
    const next = getNextReviewDate(90, from);
    const expected = new Date("2025-04-01T00:00:00Z");
    expect(next.getTime()).toBe(expected.getTime());
  });
});

// ---- mapRatingToGrade ----

describe("mapRatingToGrade", () => {
  test("blackout maps to 0", () => {
    expect(mapRatingToGrade("blackout")).toBe(0);
  });

  test("wrong maps to 1", () => {
    expect(mapRatingToGrade("wrong")).toBe(1);
  });

  test("hard maps to 3", () => {
    expect(mapRatingToGrade("hard")).toBe(3);
  });

  test("good maps to 4", () => {
    expect(mapRatingToGrade("good")).toBe(4);
  });

  test("easy maps to 5", () => {
    expect(mapRatingToGrade("easy")).toBe(5);
  });

  test("perfect maps to 5", () => {
    expect(mapRatingToGrade("perfect")).toBe(5);
  });
});

// ---- calculateOverduePriority ----

describe("calculateOverduePriority", () => {
  test("returns 0 for card not yet due", () => {
    const future = new Date(Date.now() + 86400000);
    expect(calculateOverduePriority(future, 1)).toBe(0);
  });

  test("returns > 0 for overdue card", () => {
    const past = new Date(Date.now() - 86400000 * 3); // 3 days ago
    const priority = calculateOverduePriority(past, 1);
    expect(priority).toBeGreaterThan(0);
  });

  test("caps priority at 10", () => {
    const veryOld = new Date(Date.now() - 86400000 * 365); // 1 year ago
    const priority = calculateOverduePriority(veryOld, 1);
    expect(priority).toBe(10);
  });

  test("card overdue by exactly 1 interval has priority ~1", () => {
    const now = new Date("2025-06-01T12:00:00Z");
    const dueDate = new Date("2025-05-22T12:00:00Z"); // 10 days ago
    const priority = calculateOverduePriority(dueDate, 10, now);
    expect(priority).toBeCloseTo(1, 0);
  });
});
