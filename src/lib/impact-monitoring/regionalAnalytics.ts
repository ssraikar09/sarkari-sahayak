import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { InterventionImpact, RegionalImpactRow } from "./types";

// Distribute intervention impacts across the leaderboard states deterministically.
// Lower-performing states (lower opportunityScore) receive proportionally larger share.
export function buildRegionalImpact(
  snap: InterventionPlannerSnapshot,
  impacts: InterventionImpact[],
): RegionalImpactRow[] {
  const states = snap.source.leaderboard;
  if (states.length === 0) return [];

  // Weight: inverse of opportunity score (higher need = higher weight).
  const weights = states.map((s) => Math.max(1, 100 - s.opportunityScore));
  const totalWeight = weights.reduce((a, b) => a + b, 0) || 1;

  const totalHouseholds = impacts.reduce(
    (s, i) => s + i.householdsReached,
    0,
  );
  const totalBenefits = impacts.reduce(
    (s, i) => s + i.benefitsUnlockedINR,
    0,
  );
  const avgOppLift =
    impacts.length > 0
      ? impacts.reduce((s, i) => s + i.opportunityScoreImprovement, 0) /
        impacts.length
      : 0;
  const avgRiskCut =
    impacts.length > 0
      ? impacts.reduce((s, i) => s + i.highRiskReductionPct, 0) /
        impacts.length
      : 0;
  const activeCount = impacts.filter(
    (i) => i.status !== "not-started",
  ).length;

  return states.map((st, idx) => {
    const w = weights[idx] / totalWeight;
    return {
      state: st.state,
      activeInterventions: Math.max(
        0,
        Math.round(activeCount * w * states.length) /* spread, not summed */,
      ),
      householdsImpacted: Math.round(totalHouseholds * w),
      benefitsUnlockedINR: Math.round(totalBenefits * w),
      opportunityScoreImprovement:
        Math.round(avgOppLift * (0.6 + w * states.length * 0.4) * 10) / 10,
      riskReductionPct:
        Math.round(avgRiskCut * (0.6 + w * states.length * 0.4) * 10) / 10,
    };
  });
}
