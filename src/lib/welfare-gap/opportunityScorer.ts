import type { WelfareCoverageTier } from "./types";

/**
 * Welfare Opportunity Score (0–100).
 *
 * Heuristic blend:
 *  - 70% exploration coverage (explored / eligible)
 *  - 20% breadth (eligible schemes identified vs. an expected baseline)
 *  - 10% assessment completeness (eligibility + family members assessed)
 *
 * Higher = better welfare coverage.
 */
export function computeOpportunityScore(input: {
  totalEligible: number;
  totalExplored: number;
  familyMembersAssessed: number;
  hasEligibilityAssessment: boolean;
}): { score: number; tier: WelfareCoverageTier } {
  const { totalEligible, totalExplored, familyMembersAssessed, hasEligibilityAssessment } = input;

  if (!hasEligibilityAssessment && totalEligible === 0) {
    return { score: 0, tier: "High Risk of Welfare Exclusion" };
  }

  const explorationRatio = totalEligible > 0 ? Math.min(1, totalExplored / totalEligible) : 0;
  const exploration = explorationRatio * 70;

  // Breadth: 10 eligible schemes considered a strong baseline.
  const breadth = Math.min(1, totalEligible / 10) * 20;

  // Completeness: profile + family planner usage.
  const completeness =
    (hasEligibilityAssessment ? 6 : 0) + Math.min(1, familyMembersAssessed / 3) * 4;

  const score = Math.round(exploration + breadth + completeness);
  const clamped = Math.max(0, Math.min(100, score));
  return { score: clamped, tier: tierForScore(clamped) };
}

export function tierForScore(score: number): WelfareCoverageTier {
  if (score >= 90) return "Excellent Welfare Coverage";
  if (score >= 70) return "Moderate Welfare Coverage";
  return "High Risk of Welfare Exclusion";
}
