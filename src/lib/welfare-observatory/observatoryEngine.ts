import type { NationalSnapshot } from "@/lib/command-center/types";
import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { EarlyWarningSnapshot } from "@/lib/early-warning/types";
import type { ImpactMonitoringSnapshot } from "@/lib/impact-monitoring/types";
import type { WelfareObservatorySnapshot } from "./types";

import {
  buildLifecycle,
  buildObservatoryTimeline,
} from "./lifecycleAnalytics";
import {
  buildAnalyticsTrends,
  buildCrossModuleMatrix,
  buildIntelligenceInsights,
  buildSummary,
} from "./intelligenceAggregator";
import { buildExplainers } from "./explainability";

export function buildObservatorySnapshot(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): WelfareObservatorySnapshot {
  const summary = buildSummary(national, planner, warnings, impact);
  const lifecycle = buildLifecycle(national, planner, warnings, impact);
  const insights = buildIntelligenceInsights(national, planner, warnings, impact);
  const trends = buildAnalyticsTrends(national, planner, warnings, impact);
  const matrix = buildCrossModuleMatrix(national, planner, warnings, impact);
  const timeline = buildObservatoryTimeline(national, planner, warnings, impact);
  const explainers = buildExplainers();

  const hasSufficientData =
    national.hasSufficientData && summary.householdsAnalyzed > 0;

  return {
    generatedAt: new Date().toISOString(),
    hasSufficientData,
    summary,
    lifecycle,
    insights,
    trends,
    matrix,
    timeline,
    explainers,
    sources: { national, planner, warnings, impact },
  };
}
