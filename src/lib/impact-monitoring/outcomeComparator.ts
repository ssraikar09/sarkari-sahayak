import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { InterventionImpact, BeforeAfter, OutcomeSnapshot } from "./types";

function pctDelta(before: number, after: number): number {
  if (!Number.isFinite(before) || before === 0) {
    return after === 0 ? 0 : 100;
  }
  return Math.round(((after - before) / Math.abs(before)) * 1000) / 10;
}

export function buildBeforeAfter(
  snap: InterventionPlannerSnapshot,
  impacts: InterventionImpact[],
): BeforeAfter {
  const overview = snap.source.overview;
  // Determine portion of forecasted aggregate already realized via completion factors.
  const totalCf =
    impacts.length > 0
      ? impacts.reduce((s, i) => s + i.completionFactor, 0) / impacts.length
      : 0;

  // Apply diminishing-returns-style projection scaled by avg completion.
  const agg = snap.aggregateForecast;
  const realizedOpp = Math.round(agg.opportunityScoreLift * totalCf);
  const realizedReadiness = Math.round(agg.welfareReadinessLift * totalCf);
  const realizedRisk =
    Math.round(agg.highRiskReductionPct * totalCf * 10) / 10;
  const realizedMissed =
    Math.round(agg.missedOpportunityReductionPct * totalCf * 10) / 10;
  const realizedBenefits = impacts.reduce(
    (s, i) => s + i.benefitsUnlockedINR,
    0,
  );

  const missedBase = Math.max(
    0,
    Math.round(100 - overview.averageOpportunityScore),
  );

  const before: OutcomeSnapshot = {
    opportunityScore: overview.averageOpportunityScore,
    welfareReadinessScore: overview.welfareReadinessScore,
    highRiskPercentage: overview.highRiskPercentage,
    missedOpportunityPercentage: missedBase,
    annualBenefitsINR: overview.totalEstimatedBenefitsUnlockedINR,
  };

  const after: OutcomeSnapshot = {
    opportunityScore: Math.min(100, before.opportunityScore + realizedOpp),
    welfareReadinessScore: Math.min(
      100,
      before.welfareReadinessScore + realizedReadiness,
    ),
    highRiskPercentage: Math.max(
      0,
      Math.round((before.highRiskPercentage - realizedRisk) * 10) / 10,
    ),
    missedOpportunityPercentage: Math.max(
      0,
      Math.round(
        (before.missedOpportunityPercentage *
          (1 - realizedMissed / 100)) *
          10,
      ) / 10,
    ),
    annualBenefitsINR: before.annualBenefitsINR + realizedBenefits,
  };

  return {
    before,
    after,
    deltaPct: {
      opportunityScore: pctDelta(before.opportunityScore, after.opportunityScore),
      welfareReadinessScore: pctDelta(
        before.welfareReadinessScore,
        after.welfareReadinessScore,
      ),
      highRiskPercentage: pctDelta(
        before.highRiskPercentage,
        after.highRiskPercentage,
      ),
      missedOpportunityPercentage: pctDelta(
        before.missedOpportunityPercentage,
        after.missedOpportunityPercentage,
      ),
      annualBenefitsINR: pctDelta(
        before.annualBenefitsINR,
        after.annualBenefitsINR,
      ),
    },
  };
}
