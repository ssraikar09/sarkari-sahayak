import type { RiskTier } from "./types";

/**
 * Deterministic welfare prediction primitives.
 *
 * Score formula matches Module 1 (Welfare Gap):
 *   score = round((explored / eligible) * 100)
 *
 * Risk tier:
 *   high: score < 40
 *   moderate: 40..74
 *   low: 75..100
 *
 * All inputs are derived from persisted data. No randomness, no time inputs.
 */

export function scoreFor(eligible: number, explored: number): number {
  if (eligible <= 0) return 0;
  const ratio = Math.max(0, Math.min(1, explored / eligible));
  return Math.round(ratio * 100);
}

export function riskFor(score: number): RiskTier {
  if (score < 40) return "high";
  if (score < 75) return "moderate";
  return "low";
}

export function sumBenefits(
  schemeIds: string[],
  benefitByScheme: Map<string, number>,
): number {
  let total = 0;
  for (const id of schemeIds) total += benefitByScheme.get(id) ?? 0;
  return total;
}

/**
 * Deterministic ordering of missed schemes — highest annual benefit first,
 * with scheme id as a stable tie-breaker.
 */
export function rankMissedByBenefit(
  missed: string[],
  benefitByScheme: Map<string, number>,
): string[] {
  return [...missed].sort((a, b) => {
    const diff = (benefitByScheme.get(b) ?? 0) - (benefitByScheme.get(a) ?? 0);
    if (diff !== 0) return diff;
    return a.localeCompare(b);
  });
}
