import type {
  InterventionPlannerSnapshot,
  PlannerIntervention,
} from "@/lib/intervention-planner/types";
import type {
  InterventionImpact,
  InterventionStatus,
} from "./types";

const STATUS_WEIGHT: Record<InterventionStatus, number> = {
  completed: 1.0,
  "on-track": 0.7,
  "in-progress": 0.4,
  delayed: 0.2,
  "not-started": 0.0,
};

// Deterministic status assignment from rank position (already sorted by impact desc).
export function statusForRank(idx: number, total: number): InterventionStatus {
  if (total <= 0) return "not-started";
  const p = idx / total;
  if (p < 0.2) return "completed";
  if (p < 0.4) return "on-track";
  if (p < 0.6) return "in-progress";
  if (p < 0.8) return "delayed";
  return "not-started";
}

export function buildInterventionImpacts(
  snap: InterventionPlannerSnapshot,
): InterventionImpact[] {
  const total = snap.interventions.length;
  const forecastById = new Map(snap.forecasts.map((f) => [f.interventionId, f]));
  const resourceById = new Map(snap.resources.map((r) => [r.interventionId, r]));

  return snap.interventions.map((iv: PlannerIntervention, idx: number) => {
    const status = statusForRank(idx, total);
    const cf = STATUS_WEIGHT[status];
    const fc = forecastById.get(iv.id);
    const res = resourceById.get(iv.id);
    const targeted =
      res?.householdsExpectedToBenefit ?? iv.populationAffected;
    const reached = Math.round(targeted * cf);
    const oppLift = Math.round((fc?.opportunityScoreLift ?? 0) * cf);
    const readinessLift = Math.round((fc?.welfareReadinessLift ?? 0) * cf);
    const riskCut = Math.round((fc?.highRiskReductionPct ?? 0) * cf * 10) / 10;
    const missedCut =
      Math.round((fc?.missedOpportunityReductionPct ?? 0) * cf * 10) / 10;
    const benefits = Math.round((fc?.annualBenefitIncreaseINR ?? 0) * cf);
    const effectiveness = Math.min(100, Math.round(iv.impactScore * cf));

    return {
      interventionId: iv.id,
      title: iv.title,
      kind: iv.kind,
      status,
      priority: iv.priority,
      householdsTargeted: targeted,
      householdsReached: reached,
      opportunityScoreImprovement: oppLift,
      readinessScoreImprovement: readinessLift,
      highRiskReductionPct: riskCut,
      missedOpportunityReductionPct: missedCut,
      benefitsUnlockedINR: benefits,
      effectivenessScore: effectiveness,
      completionFactor: cf,
    };
  });
}
