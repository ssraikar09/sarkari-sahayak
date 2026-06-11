import type { RiskDistribution } from "./types";

/**
 * Bucket Opportunity Scores into welfare risk tiers.
 * - High Risk: score < 40
 * - Moderate: 40 ≤ score < 75
 * - Low: score ≥ 75
 */
export function bucketRisk(scores: number[]): RiskDistribution {
  const dist: RiskDistribution = { high: 0, moderate: 0, low: 0, total: scores.length };
  for (const s of scores) {
    if (s < 40) dist.high += 1;
    else if (s < 75) dist.moderate += 1;
    else dist.low += 1;
  }
  return dist;
}
