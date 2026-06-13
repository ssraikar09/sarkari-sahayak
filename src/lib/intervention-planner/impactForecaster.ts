import type { NationalSnapshot } from "@/lib/command-center/types";
import type { ImpactForecast, PlannerIntervention, InterventionKind } from "./types";

type ForecastWeights = {
  oppScore: number;
  readiness: number;
  riskReductionPct: number;
  missedReductionPct: number;
  benefitMultiplier: number;
};

const WEIGHTS: Record<InterventionKind, ForecastWeights> = {
  "csc-outreach": {
    oppScore: 10,
    readiness: 8,
    riskReductionPct: 12,
    missedReductionPct: 14,
    benefitMultiplier: 1.1,
  },
  "documentation-assistance": {
    oppScore: 8,
    readiness: 6,
    riskReductionPct: 10,
    missedReductionPct: 18,
    benefitMultiplier: 1.2,
  },
  "awareness-campaign": {
    oppScore: 6,
    readiness: 4,
    riskReductionPct: 6,
    missedReductionPct: 12,
    benefitMultiplier: 0.9,
  },
  "navigator-onboarding": {
    oppScore: 7,
    readiness: 5,
    riskReductionPct: 8,
    missedReductionPct: 16,
    benefitMultiplier: 1.0,
  },
  "scheme-promotion": {
    oppScore: 5,
    readiness: 4,
    riskReductionPct: 5,
    missedReductionPct: 10,
    benefitMultiplier: 0.85,
  },
};

function priorityFactor(p: PlannerIntervention["priority"]): number {
  switch (p) {
    case "critical":
      return 1.2;
    case "high":
      return 1.0;
    case "medium":
      return 0.8;
    case "low":
      return 0.6;
  }
}

export function buildForecasts(
  interventions: PlannerIntervention[],
  snap: NationalSnapshot,
): ImpactForecast[] {
  return interventions.map((iv) => {
    const w = WEIGHTS[iv.kind];
    const f = priorityFactor(iv.priority);
    const headroom = Math.max(5, 100 - snap.overview.averageOpportunityScore);
    const oppLift = Math.min(headroom, Math.round(w.oppScore * f));
    const readinessLift = Math.min(
      Math.max(5, 100 - snap.overview.welfareReadinessScore),
      Math.round(w.readiness * f),
    );
    const highRiskCut = Math.min(
      snap.overview.highRiskPercentage,
      Math.round(w.riskReductionPct * f),
    );
    const missedCut = Math.min(100, Math.round(w.missedReductionPct * f));
    const benefitInc = Math.round(iv.estimatedBenefitUnlockedINR * w.benefitMultiplier);
    return {
      interventionId: iv.id,
      opportunityScoreLift: oppLift,
      welfareReadinessLift: readinessLift,
      highRiskReductionPct: highRiskCut,
      missedOpportunityReductionPct: missedCut,
      annualBenefitIncreaseINR: benefitInc,
    };
  });
}

export function aggregateForecasts(
  forecasts: ImpactForecast[],
  snap: NationalSnapshot,
): {
  opportunityScoreLift: number;
  welfareReadinessLift: number;
  highRiskReductionPct: number;
  missedOpportunityReductionPct: number;
  annualBenefitIncreaseINR: number;
} {
  if (forecasts.length === 0) {
    return {
      opportunityScoreLift: 0,
      welfareReadinessLift: 0,
      highRiskReductionPct: 0,
      missedOpportunityReductionPct: 0,
      annualBenefitIncreaseINR: 0,
    };
  }
  // Use diminishing returns: max + 25% of remainder.
  const reduce = (vals: number[], cap: number) => {
    const sorted = [...vals].sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const rest = sorted.slice(1).reduce((s, v) => s + v, 0);
    return Math.min(cap, Math.round(top + rest * 0.25));
  };
  const headroomOpp = Math.max(5, 100 - snap.overview.averageOpportunityScore);
  const headroomReadiness = Math.max(5, 100 - snap.overview.welfareReadinessScore);
  const headroomRisk = snap.overview.highRiskPercentage;
  return {
    opportunityScoreLift: reduce(forecasts.map((f) => f.opportunityScoreLift), headroomOpp),
    welfareReadinessLift: reduce(
      forecasts.map((f) => f.welfareReadinessLift),
      headroomReadiness,
    ),
    highRiskReductionPct: reduce(forecasts.map((f) => f.highRiskReductionPct), headroomRisk),
    missedOpportunityReductionPct: reduce(
      forecasts.map((f) => f.missedOpportunityReductionPct),
      100,
    ),
    annualBenefitIncreaseINR: forecasts.reduce(
      (s, f) => s + f.annualBenefitIncreaseINR,
      0,
    ),
  };
}
