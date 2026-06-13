import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type {
  ImpactMonitoringSnapshot,
  ImpactSummary,
  InterventionImpact,
  SuccessIndicator,
  TimelineMilestone,
} from "./types";
import { buildInterventionImpacts } from "./interventionTracker";
import { buildBeforeAfter } from "./outcomeComparator";
import { buildRegionalImpact } from "./regionalAnalytics";
import { buildExplainers } from "./explainability";

function summarize(impacts: InterventionImpact[]): ImpactSummary {
  if (impacts.length === 0) {
    return {
      interventionsMonitored: 0,
      householdsPositivelyImpacted: 0,
      opportunityScoreUplift: 0,
      welfareReadinessUplift: 0,
      highRiskReductionPct: 0,
      annualBenefitsUnlockedINR: 0,
      averageCompletionPct: 0,
    };
  }
  const avgCf =
    impacts.reduce((s, i) => s + i.completionFactor, 0) / impacts.length;
  // Diminishing-returns aggregation for percentage-style metrics.
  const reduce = (vals: number[], cap: number) => {
    const sorted = [...vals].sort((a, b) => b - a);
    const top = sorted[0] ?? 0;
    const rest = sorted.slice(1).reduce((s, v) => s + v, 0);
    return Math.min(cap, Math.round((top + rest * 0.25) * 10) / 10);
  };
  return {
    interventionsMonitored: impacts.length,
    householdsPositivelyImpacted: impacts.reduce(
      (s, i) => s + i.householdsReached,
      0,
    ),
    opportunityScoreUplift: reduce(
      impacts.map((i) => i.opportunityScoreImprovement),
      100,
    ),
    welfareReadinessUplift: reduce(
      impacts.map((i) => i.readinessScoreImprovement),
      100,
    ),
    highRiskReductionPct: reduce(
      impacts.map((i) => i.highRiskReductionPct),
      100,
    ),
    annualBenefitsUnlockedINR: impacts.reduce(
      (s, i) => s + i.benefitsUnlockedINR,
      0,
    ),
    averageCompletionPct: Math.round(avgCf * 100),
  };
}

function buildTimeline(
  impacts: InterventionImpact[],
  summary: ImpactSummary,
): TimelineMilestone[] {
  const completion = summary.averageCompletionPct;
  return [
    {
      stage: "baseline",
      label: "Baseline established",
      achieved: impacts.length > 0,
      detail: `${impacts.length} interventions enrolled with deterministic baseline metrics.`,
      progressPct: impacts.length > 0 ? 100 : 0,
    },
    {
      stage: "30-day",
      label: "30-day review",
      achieved: completion >= 20,
      detail: "Initial mobilization: CSC outreach and documentation camps active.",
      progressPct: Math.min(100, Math.round(completion * 5)),
    },
    {
      stage: "60-day",
      label: "60-day review",
      achieved: completion >= 40,
      detail: "Mid-cycle uplift: awareness and navigator engagement scale.",
      progressPct: Math.min(100, Math.round(completion * 2.5)),
    },
    {
      stage: "90-day",
      label: "90-day review",
      achieved: completion >= 60,
      detail: "Late-cycle consolidation: scheme utilization tracked across regions.",
      progressPct: Math.min(100, Math.round(completion * 1.6)),
    },
    {
      stage: "final",
      label: "Final outcome assessment",
      achieved: completion >= 80,
      detail: "Closure review: impact verified against forecasted aggregates.",
      progressPct: Math.min(100, Math.round(completion * 1.25)),
    },
  ];
}

function buildIndicators(
  snap: InterventionPlannerSnapshot,
  impacts: InterventionImpact[],
): SuccessIndicator[] {
  const docCutBase = snap.source.alerts.filter(
    (a) => a.category === "documentation-barrier",
  ).length;
  const lowUtilBase = snap.source.alerts.filter(
    (a) => a.category === "low-utilization",
  ).length;
  const navAlerts = snap.source.alerts.filter(
    (a) => a.category === "navigator-adoption",
  ).length;

  const docReduction = impacts
    .filter((i) => i.kind === "documentation-assistance")
    .reduce((s, i) => s + i.completionFactor, 0);
  const navReduction = impacts
    .filter((i) => i.kind === "navigator-onboarding")
    .reduce((s, i) => s + i.completionFactor, 0);
  const cscReduction = impacts
    .filter((i) => i.kind === "csc-outreach")
    .reduce((s, i) => s + i.completionFactor, 0);
  const awarenessReduction = impacts
    .filter((i) => i.kind === "awareness-campaign")
    .reduce((s, i) => s + i.completionFactor, 0);
  const schemeReduction = impacts
    .filter((i) => i.kind === "scheme-promotion")
    .reduce((s, i) => s + i.completionFactor, 0);

  const households = snap.source.overview.householdsAnalyzed;
  const totalReached = impacts.reduce((s, i) => s + i.householdsReached, 0);

  const ind: SuccessIndicator[] = [
    {
      key: "doc-barriers",
      label: "Documentation barriers reduced",
      unit: "%",
      baseline: docCutBase * 10,
      current: Math.round(docCutBase * 10 * (1 - Math.min(1, docReduction))),
      changePct: -Math.round(Math.min(1, docReduction) * 100),
      source: "documentation-barrier alerts × completion",
    },
    {
      key: "navigator-engagement",
      label: "Navigator engagement increased",
      unit: "%",
      baseline: Math.max(5, navAlerts * 8),
      current: Math.round(
        Math.max(5, navAlerts * 8) * (1 + Math.min(1, navReduction)),
      ),
      changePct: Math.round(Math.min(1, navReduction) * 100),
      source: "navigator-adoption alerts × completion",
    },
    {
      key: "scheme-utilization",
      label: "Scheme utilization improved",
      unit: "%",
      baseline: Math.max(5, lowUtilBase * 6),
      current: Math.round(
        Math.max(5, lowUtilBase * 6) * (1 + Math.min(1, schemeReduction * 0.8)),
      ),
      changePct: Math.round(Math.min(1, schemeReduction * 0.8) * 100),
      source: "low-utilization alerts × scheme-promotion completion",
    },
    {
      key: "csc-outreach",
      label: "CSC outreach growth",
      unit: "x",
      baseline: 1,
      current: Math.round((1 + Math.min(2, cscReduction)) * 10) / 10,
      changePct: Math.round(Math.min(2, cscReduction) * 100),
      source: "csc-outreach interventions × completion",
    },
    {
      key: "awareness-reach",
      label: "Awareness campaign reach",
      unit: "households",
      baseline: 0,
      current: Math.round(households * 0.1 * Math.min(3, awarenessReduction)),
      changePct: 100,
      source: "awareness-campaign × households analyzed × 10%",
    },
    {
      key: "coverage",
      label: "Household coverage expansion",
      unit: "%",
      baseline: 0,
      current: households > 0 ? Math.round((totalReached / households) * 100) : 0,
      changePct:
        households > 0 ? Math.round((totalReached / households) * 100) : 0,
      source: "Σ householdsReached / households analyzed",
    },
  ];
  return ind;
}

export function buildImpactSnapshot(
  planner: InterventionPlannerSnapshot,
): ImpactMonitoringSnapshot {
  const interventions = buildInterventionImpacts(planner);
  const summary = summarize(interventions);
  const beforeAfter = buildBeforeAfter(planner, interventions);
  const timeline = buildTimeline(interventions, summary);
  const indicators = buildIndicators(planner, interventions);
  const regional = buildRegionalImpact(planner, interventions);
  const explainers = buildExplainers();

  return {
    generatedAt: planner.generatedAt,
    hasSufficientData:
      planner.hasSufficientData && interventions.length > 0,
    summary,
    interventions,
    beforeAfter,
    timeline,
    indicators,
    regional,
    explainers,
    source: planner,
  };
}
