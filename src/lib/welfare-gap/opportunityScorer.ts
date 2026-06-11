import type { WelfareCoverageTier } from "./types";

/**
 * Welfare Opportunity Score (0–100) — deterministic.
 *
 * Formula:
 *   score = round( (explored_schemes / total_eligible_schemes) * 100 )
 *
 * Derived only from persisted data (eligible scheme set + explored scheme set).
 * No randomness, no time-dependent inputs.
 */
export function computeOpportunityScore(input: {
  totalEligible: number;
  totalExplored: number;
}): { score: number; tier: WelfareCoverageTier } {
  const { totalEligible, totalExplored } = input;
  if (totalEligible <= 0) {
    return { score: 0, tier: "High Risk of Welfare Exclusion" };
  }
  const ratio = Math.min(1, Math.max(0, totalExplored / totalEligible));
  const score = Math.round(ratio * 100);
  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, tier: tierForScore(clamped) };
}

export function tierForScore(score: number): WelfareCoverageTier {
  if (score >= 90) return "Excellent Welfare Coverage";
  if (score >= 70) return "Moderate Welfare Coverage";
  return "High Risk of Welfare Exclusion";
}
