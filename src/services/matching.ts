/**
 * Roommate compatibility scoring service.
 * Pure, modular, reusable. Returns 0-100 score.
 */

export interface LifestyleProfile {
  budget_min: number | null;
  budget_max: number | null;
  cleanliness: "relaxed" | "average" | "tidy" | "very_tidy" | null;
  sleep_schedule: "early_bird" | "average" | "night_owl" | null;
  smoking: boolean | null;
  guest_frequency: "never" | "rarely" | "sometimes" | "often" | null;
}

const CLEAN_RANK = { relaxed: 0, average: 1, tidy: 2, very_tidy: 3 } as const;
const SLEEP_RANK = { early_bird: 0, average: 1, night_owl: 2 } as const;
const GUEST_RANK = { never: 0, rarely: 1, sometimes: 2, often: 3 } as const;

const WEIGHTS = {
  budget: 25,
  cleanliness: 25,
  sleep: 20,
  smoking: 20,
  guests: 10,
};

function budgetScore(a: LifestyleProfile, b: LifestyleProfile): number {
  if (a.budget_min == null || a.budget_max == null || b.budget_min == null || b.budget_max == null) return 0.5;
  const overlapMin = Math.max(a.budget_min, b.budget_min);
  const overlapMax = Math.min(a.budget_max, b.budget_max);
  if (overlapMax < overlapMin) return 0;
  const overlap = overlapMax - overlapMin;
  const span = Math.max(a.budget_max - a.budget_min, b.budget_max - b.budget_min, 1);
  return Math.min(1, overlap / span);
}

function rankScore<T extends string>(a: T | null, b: T | null, ranks: Record<string, number>, maxDist: number) {
  if (!a || !b) return 0.5;
  const dist = Math.abs(ranks[a] - ranks[b]);
  return 1 - dist / maxDist;
}

function smokingScore(a: LifestyleProfile, b: LifestyleProfile): number {
  if (a.smoking == null || b.smoking == null) return 0.5;
  return a.smoking === b.smoking ? 1 : 0;
}

export function compatibilityScore(a: LifestyleProfile, b: LifestyleProfile): number {
  const parts = [
    budgetScore(a, b) * WEIGHTS.budget,
    rankScore(a.cleanliness, b.cleanliness, CLEAN_RANK, 3) * WEIGHTS.cleanliness,
    rankScore(a.sleep_schedule, b.sleep_schedule, SLEEP_RANK, 2) * WEIGHTS.sleep,
    smokingScore(a, b) * WEIGHTS.smoking,
    rankScore(a.guest_frequency, b.guest_frequency, GUEST_RANK, 3) * WEIGHTS.guests,
  ];
  const total = parts.reduce((s, x) => s + x, 0);
  return Math.round(total);
}

export interface MatchResult<T> {
  candidate: T;
  score: number;
}

export function rankMatches<T extends LifestyleProfile>(me: LifestyleProfile, candidates: T[]): MatchResult<T>[] {
  return candidates
    .map((c) => ({ candidate: c, score: compatibilityScore(me, c) }))
    .sort((a, b) => b.score - a.score);
}
