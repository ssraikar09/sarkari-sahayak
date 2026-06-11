import type { WelfareGapAnalysis } from "@/lib/welfare-gap/types";
import type { FamilyMember } from "@/lib/family-planner";
import type { HouseholdMemberSummary } from "./types";

const HIGH_RISK_SCORE = 40;
const MOD_RISK_SCORE = 70;

/**
 * Per-member household summaries derived from the existing Welfare Gap
 * Intelligence engine — keeps Module 14 deterministic with Module 9.
 */
export function buildHouseholdSummaries(
  citizenId: string,
  citizenName: string,
  family: FamilyMember[],
  gap: WelfareGapAnalysis,
): HouseholdMemberSummary[] {
  const familyById = new Map(family.map((f) => [f.id, f]));
  return gap.members.map((m) => {
    const fam = familyById.get(m.memberId);
    const relationship =
      m.memberId === citizenId
        ? "Head of Family"
        : (fam?.relationship ?? m.relationship ?? "Family");
    const score = relativeScore(m.eligibleCount, m.exploredCount);
    return {
      memberId: m.memberId,
      name: m.memberId === citizenId ? citizenName : (fam?.full_name ?? m.name),
      relationship,
      opportunityScore: score,
      eligibleCount: m.eligibleCount,
      missedCount: m.missedCount,
      estimatedAnnualBenefitINR: m.missedSchemes.reduce(
        (sum, s) => sum + s.annualValueINR,
        0,
      ),
      riskCategory:
        score < HIGH_RISK_SCORE
          ? "High"
          : score < MOD_RISK_SCORE
            ? "Moderate"
            : "Low",
    };
  });
}

function relativeScore(eligible: number, explored: number): number {
  if (eligible === 0) return 0;
  return Math.round((explored / eligible) * 100);
}

export function riskColor(risk: HouseholdMemberSummary["riskCategory"]): string {
  if (risk === "High") return "#e11d48"; // rose-600
  if (risk === "Moderate") return "#d97706"; // amber-600
  return "#059669"; // emerald-600
}
