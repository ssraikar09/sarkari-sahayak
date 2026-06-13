import { createServerFn } from "@tanstack/react-start";
import type { EarlyWarningSnapshot } from "./types";

export const getEarlyWarningFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<EarlyWarningSnapshot> => {
    const { getCommandCenterFn } = await import(
      "@/lib/command-center/nationalAnalytics"
    );
    const { generateWarningAlerts } = await import("./alertGenerator");
    const { buildWarningTrends } = await import("./trendBuilder");

    const source = await getCommandCenterFn();
    const alerts = generateWarningAlerts(source);
    const trends = buildWarningTrends(alerts);

    const criticalAlerts = alerts.filter((a) => a.severity === "critical").length;
    const highPriorityAlerts = alerts.filter(
      (a) => a.severity === "critical" || a.severity === "high",
    ).length;
    const householdsUnderObservation = alerts.reduce(
      (s, a) => s + a.householdsAffected,
      0,
    );
    const benefitsAtRiskINR = alerts.reduce(
      (s, a) => s + a.potentialBenefitLossINR,
      0,
    );

    return {
      generatedAt: source.generatedAt,
      hasSufficientData: source.hasSufficientData,
      summary: {
        activeAlerts: alerts.length,
        criticalAlerts,
        highPriorityAlerts,
        householdsUnderObservation,
        benefitsAtRiskINR,
      },

      alerts,
      trends,
      context: {
        householdsAnalyzed: source.overview.householdsAnalyzed,
        averageOpportunityScore: source.overview.averageOpportunityScore,
        welfareReadinessScore: source.overview.welfareReadinessScore,
        highRiskPercentage: source.overview.highRiskPercentage,
      },
      source,
    };
  });
