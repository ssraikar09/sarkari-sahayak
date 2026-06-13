import { createServerFn } from "@tanstack/react-start";
import type { InterventionPlannerSnapshot } from "./types";

export const getInterventionPlannerFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<InterventionPlannerSnapshot> => {
    const { getCommandCenterFn } = await import(
      "@/lib/command-center/nationalAnalytics"
    );
    const { buildPlannerInterventions } = await import("./interventionEngine");
    const { buildRoadmaps } = await import("./roadmapGenerator");
    const { buildResourcePlans } = await import("./resourceEstimator");
    const { buildForecasts, aggregateForecasts } = await import(
      "./impactForecaster"
    );
    const { buildExplainers, buildRisks, buildComparison } = await import(
      "./explainability"
    );

    const snap = await getCommandCenterFn();
    const interventions = buildPlannerInterventions(snap);
    const roadmaps = buildRoadmaps(interventions);
    const resources = buildResourcePlans(interventions);
    const forecasts = buildForecasts(interventions, snap);
    const aggregate = aggregateForecasts(forecasts, snap);
    const explainers = buildExplainers(interventions);
    const risks = buildRisks(interventions);
    const comparison = buildComparison(interventions, resources);

    return {
      generatedAt: snap.generatedAt,
      hasSufficientData: snap.hasSufficientData && interventions.length > 0,
      interventions,
      roadmaps,
      resources,
      forecasts,
      risks,
      explainers,
      comparison,
      aggregateForecast: aggregate,
      context: {
        householdsAnalyzed: snap.overview.householdsAnalyzed,
        averageOpportunityScore: snap.overview.averageOpportunityScore,
        welfareReadinessScore: snap.overview.welfareReadinessScore,
        highRiskPercentage: snap.overview.highRiskPercentage,
        totalEligibleSchemes: snap.overview.totalEligibleSchemes,
      },
      source: snap,
    };
  });
