import type { NationalSnapshot } from "@/lib/command-center/types";
import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { EarlyWarningSnapshot } from "@/lib/early-warning/types";
import type { ImpactMonitoringSnapshot } from "@/lib/impact-monitoring/types";
import type {
  LifecycleStage,
  ObservatoryTimelineMilestone,
} from "./types";

export function buildLifecycle(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): LifecycleStage[] {
  const households = national.overview.householdsAnalyzed;
  const schemes = national.overview.totalEligibleSchemes;
  return [
    {
      key: "discovery",
      label: "Citizen Discovery",
      route: "/schemes",
      module: "Modules 1–4",
      description: "Citizens discover schemes through guided catalogues.",
      evidence: "Scheme catalogue and recommended categories from research analytics.",
      status: "active",
      metricLabel: "Schemes monitored",
      metricValue: schemes.toLocaleString(),
    },
    {
      key: "eligibility",
      label: "Eligibility Assessment",
      route: "/eligibility",
      module: "Module 5",
      description: "Deterministic eligibility evaluation across schemes.",
      evidence: "Household profiles assessed by the eligibility engine.",
      status: "active",
      metricLabel: "Households analyzed",
      metricValue: households.toLocaleString(),
    },
    {
      key: "assistance",
      label: "AI Assistance",
      route: "/assistant",
      module: "Module 6",
      description: "Conversational guidance to clarify scheme criteria.",
      evidence: "Citizen-assistant dialogues grounded on scheme knowledge.",
      status: "active",
      metricLabel: "Conversational coverage",
      metricValue: `${national.trends.recommendedCategories.length} categories`,
    },
    {
      key: "family-planning",
      label: "Family Welfare Planning",
      route: "/family-planner",
      module: "Modules 7–8",
      description: "Household-level welfare plans across members.",
      evidence: "Composite household profiles aggregated from member assessments.",
      status: "active",
      metricLabel: "High-risk households",
      metricValue: Math.round(
        (national.overview.highRiskPercentage / 100) * households,
      ).toLocaleString(),
    },
    {
      key: "navigator",
      label: "Navigator Support",
      route: "/navigator",
      module: "Modules 9–11",
      description: "Welfare navigator and roadmap guidance.",
      evidence: "Navigator goal demand recorded across states.",
      status: "active",
      metricLabel: "Goals tracked",
      metricValue: national.goals.length.toString(),
    },
    {
      key: "policy",
      label: "Policy Intelligence",
      route: "/policy-intelligence",
      module: "Modules 16–17",
      description: "Translates citizen analytics into policy signals.",
      evidence: "National overview, state demand & risk leaderboards.",
      status: "monitoring",
      metricLabel: "Policy signals",
      metricValue: national.upstreamRecommendations.length.toString(),
    },
    {
      key: "outcome",
      label: "Outcome Prediction",
      route: "/outcome-prediction",
      module: "Module 18",
      description: "Predicts welfare outcomes from current trajectories.",
      evidence: "Opportunity-score and readiness signals at baseline.",
      status: "monitoring",
      metricLabel: "Opportunity score",
      metricValue: national.overview.averageOpportunityScore.toFixed(0),
    },
    {
      key: "digital-twin",
      label: "Digital Twin Simulation",
      route: "/digital-twin",
      module: "Module 19",
      description: "Runs deterministic welfare scenario simulations.",
      evidence: "National snapshot serves as the deterministic twin baseline.",
      status: "monitoring",
      metricLabel: "Twin baseline",
      metricValue: new Date(national.generatedAt).toLocaleDateString(),
    },
    {
      key: "intervention",
      label: "Intervention Planning",
      route: "/intervention-planner",
      module: "Module 21",
      description: "Ranks and plans welfare interventions.",
      evidence: "Planner aggregate forecast across recommended interventions.",
      status: "ready",
      metricLabel: "Active interventions",
      metricValue: planner.interventions.length.toString(),
    },
    {
      key: "offline",
      label: "Offline CSC Support",
      route: "/offline-assistance",
      module: "Module 22",
      description: "Operator-ready offline welfare delivery.",
      evidence: "CSC operator capacity scaled from planner resources.",
      status: "ready",
      metricLabel: "CSC operators planned",
      metricValue: planner.resources
        .reduce((s, r) => s + r.cscOperators, 0)
        .toString(),
    },
    {
      key: "early-warning",
      label: "Early Warning",
      route: "/early-warning",
      module: "Module 23",
      description: "Detects emerging welfare risks before exclusion.",
      evidence: "Deterministic alerts derived from national signals.",
      status: "monitoring",
      metricLabel: "Active alerts",
      metricValue: warnings.summary.activeAlerts.toString(),
    },
    {
      key: "impact",
      label: "Impact Monitoring",
      route: "/impact-monitoring",
      module: "Module 24",
      description: "Measures realized welfare improvements.",
      evidence: "Before/after outcomes scaled by intervention completion.",
      status: "ready",
      metricLabel: "Interventions monitored",
      metricValue: impact.summary.interventionsMonitored.toString(),
    },
  ];
}

export function buildObservatoryTimeline(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): ObservatoryTimelineMilestone[] {
  const households = national.overview.householdsAnalyzed;
  const hasHouseholds = households > 0;
  const hasInterventions = planner.interventions.length > 0;
  const hasAlerts = warnings.summary.activeAlerts > 0;
  const monitored = impact.summary.interventionsMonitored > 0;
  const completion = impact.summary.averageCompletionPct;

  return [
    {
      stage: "discovery",
      label: "Discovery",
      detail: `${national.overview.totalEligibleSchemes.toLocaleString()} schemes catalogued`,
      achieved: true,
      progressPct: 100,
    },
    {
      stage: "assessment",
      label: "Assessment",
      detail: `${households.toLocaleString()} households assessed`,
      achieved: hasHouseholds,
      progressPct: hasHouseholds ? 100 : 0,
    },
    {
      stage: "guidance",
      label: "Guidance",
      detail: `${national.goals.length} welfare goals tracked`,
      achieved: hasHouseholds,
      progressPct: hasHouseholds ? 90 : 10,
    },
    {
      stage: "planning",
      label: "Planning",
      detail: `${planner.interventions.length} interventions planned`,
      achieved: hasInterventions,
      progressPct: hasInterventions ? 100 : 20,
    },
    {
      stage: "prediction",
      label: "Prediction",
      detail: `Opportunity baseline ${national.overview.averageOpportunityScore.toFixed(0)}`,
      achieved: hasHouseholds,
      progressPct: hasHouseholds ? 80 : 10,
    },
    {
      stage: "intervention",
      label: "Intervention",
      detail: hasAlerts
        ? `${warnings.summary.activeAlerts} alerts under preventive response`
        : "No active alerts",
      achieved: hasInterventions,
      progressPct: hasInterventions ? 70 : 0,
    },
    {
      stage: "monitoring",
      label: "Monitoring",
      detail: monitored
        ? `${impact.summary.interventionsMonitored} initiatives monitored`
        : "Awaiting active monitoring",
      achieved: monitored,
      progressPct: monitored ? Math.max(40, completion) : 0,
    },
    {
      stage: "impact",
      label: "Impact",
      detail: monitored
        ? `+${impact.summary.opportunityScoreUplift} opportunity uplift`
        : "Pending measurable impact",
      achieved: monitored && completion >= 50,
      progressPct: monitored ? completion : 0,
    },
  ];
}
