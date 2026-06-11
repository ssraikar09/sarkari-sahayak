import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { SchemeDecision } from "@/lib/decision-engine/types";

export type JourneyBand = "Vulnerable" | "Developing" | "Welfare Ready";

export function bandFor(score: number): JourneyBand {
  if (score >= 70) return "Welfare Ready";
  if (score >= 40) return "Developing";
  return "Vulnerable";
}

/**
 * 0-100 preparedness score combining:
 *  - eligible scheme ratio (50%)
 *  - profile completeness (20%)
 *  - average confidence of eligible schemes (20%)
 *  - household coverage (10%)
 */
export function computeJourneyScore(
  profile: CitizenProfile,
  decisions: SchemeDecision[],
  householdMembers: number,
): number {
  const total = decisions.length || 1;
  const eligible = decisions.filter((d) => d.status === "eligible");
  const eligibleRatio = eligible.length / total;

  const fields = [
    profile.full_name,
    profile.state,
    profile.district,
    profile.occupation,
    profile.annual_income,
    profile.education_level,
    profile.preferred_language,
  ];
  const completeness = fields.filter((f) => f && String(f).trim().length > 0).length / fields.length;

  const avgConfidence =
    eligible.length === 0
      ? 0
      : eligible.reduce((s, d) => s + d.confidence.score, 0) / eligible.length / 100;

  const householdCoverage = Math.min(1, householdMembers / Math.max(1, profile.family_members));

  const score =
    eligibleRatio * 50 + completeness * 20 + avgConfidence * 20 + householdCoverage * 10;
  return Math.round(Math.max(0, Math.min(100, score)));
}
