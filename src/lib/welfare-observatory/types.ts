import type { NationalSnapshot } from "@/lib/command-center/types";
import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { EarlyWarningSnapshot } from "@/lib/early-warning/types";
import type { ImpactMonitoringSnapshot } from "@/lib/impact-monitoring/types";

export type ObservatorySummary = {
  householdsAnalyzed: number;
  schemesMonitored: number;
  opportunityScore: number;
  welfareReadinessScore: number;
  annualBenefitsUnlockedINR: number;
  highRiskHouseholds: number;
  activeInterventions: number;
  activeAlerts: number;
  impactInitiativesMonitored: number;
};

export type LifecycleStageKey =
  | "discovery"
  | "eligibility"
  | "assistance"
  | "family-planning"
  | "navigator"
  | "policy"
  | "outcome"
  | "digital-twin"
  | "intervention"
  | "offline"
  | "early-warning"
  | "impact";

export type LifecycleStage = {
  key: LifecycleStageKey;
  label: string;
  route: string;
  description: string;
  module: string;
  evidence: string;
  status: "active" | "monitoring" | "ready";
  metricLabel: string;
  metricValue: string;
};

export type IntelligenceInsight = {
  id: string;
  kind:
    | "underserved-population"
    | "high-impact-intervention"
    | "region-attention"
    | "underutilized-scheme"
    | "unrealized-benefit"
    | "emerging-priority";
  title: string;
  detail: string;
  contributingModules: string[];
  datasets: string[];
  rules: string[];
  evidence: string;
};

export type AnalyticsTrendPoint = {
  label: string;
  value: number;
  unit: string;
};

export type AnalyticsTrend = {
  key:
    | "opportunity-score"
    | "welfare-readiness"
    | "benefit-unlocks"
    | "alert-volume"
    | "intervention-effectiveness"
    | "impact-achievements";
  label: string;
  series: AnalyticsTrendPoint[];
  delta: number;
  deltaUnit: string;
  source: string;
};

export type CrossModuleContribution = {
  band: "Citizen Welfare (Modules 1–15)" | "Policy & Research (Modules 16–20)" | "Execution (Modules 21–24)";
  modules: { name: string; contribution: string; outcome: string }[];
};

export type ObservatoryTimelineMilestone = {
  stage:
    | "discovery"
    | "assessment"
    | "guidance"
    | "planning"
    | "prediction"
    | "intervention"
    | "monitoring"
    | "impact";
  label: string;
  achieved: boolean;
  detail: string;
  progressPct: number;
};

export type ObservatoryExplainer = {
  insight: string;
  modules: string[];
  datasets: string[];
  rules: string[];
  evidence: string;
};

export type WelfareObservatorySnapshot = {
  generatedAt: string;
  hasSufficientData: boolean;
  summary: ObservatorySummary;
  lifecycle: LifecycleStage[];
  insights: IntelligenceInsight[];
  trends: AnalyticsTrend[];
  matrix: CrossModuleContribution[];
  timeline: ObservatoryTimelineMilestone[];
  explainers: ObservatoryExplainer[];
  sources: {
    national: NationalSnapshot;
    planner: InterventionPlannerSnapshot;
    warnings: EarlyWarningSnapshot;
    impact: ImpactMonitoringSnapshot;
  };
};
