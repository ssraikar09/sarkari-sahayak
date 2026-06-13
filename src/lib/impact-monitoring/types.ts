import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";

export type InterventionStatus =
  | "not-started"
  | "in-progress"
  | "on-track"
  | "delayed"
  | "completed";

export type InterventionImpact = {
  interventionId: string;
  title: string;
  kind: string;
  status: InterventionStatus;
  priority: "critical" | "high" | "medium" | "low";
  householdsTargeted: number;
  householdsReached: number;
  opportunityScoreImprovement: number;
  readinessScoreImprovement: number;
  highRiskReductionPct: number;
  missedOpportunityReductionPct: number;
  benefitsUnlockedINR: number;
  effectivenessScore: number; // 0..100
  completionFactor: number; // 0..1
};

export type OutcomeSnapshot = {
  opportunityScore: number;
  welfareReadinessScore: number;
  highRiskPercentage: number;
  missedOpportunityPercentage: number;
  annualBenefitsINR: number;
};

export type BeforeAfter = {
  before: OutcomeSnapshot;
  after: OutcomeSnapshot;
  deltaPct: {
    opportunityScore: number;
    welfareReadinessScore: number;
    highRiskPercentage: number;
    missedOpportunityPercentage: number;
    annualBenefitsINR: number;
  };
};

export type ImpactTimelineStage =
  | "baseline"
  | "30-day"
  | "60-day"
  | "90-day"
  | "final";

export type TimelineMilestone = {
  stage: ImpactTimelineStage;
  label: string;
  achieved: boolean;
  detail: string;
  progressPct: number;
};

export type SuccessIndicator = {
  key: string;
  label: string;
  unit: string;
  baseline: number;
  current: number;
  changePct: number;
  source: string;
};

export type RegionalImpactRow = {
  state: string;
  activeInterventions: number;
  householdsImpacted: number;
  benefitsUnlockedINR: number;
  opportunityScoreImprovement: number;
  riskReductionPct: number;
};

export type MetricExplainer = {
  metric: string;
  formula: string;
  modules: string[];
  datasets: string[];
  evidence: string;
};

export type ImpactSummary = {
  interventionsMonitored: number;
  householdsPositivelyImpacted: number;
  opportunityScoreUplift: number;
  welfareReadinessUplift: number;
  highRiskReductionPct: number;
  annualBenefitsUnlockedINR: number;
  averageCompletionPct: number;
};

export type ImpactMonitoringSnapshot = {
  generatedAt: string;
  hasSufficientData: boolean;
  summary: ImpactSummary;
  interventions: InterventionImpact[];
  beforeAfter: BeforeAfter;
  timeline: TimelineMilestone[];
  indicators: SuccessIndicator[];
  regional: RegionalImpactRow[];
  explainers: MetricExplainer[];
  source: InterventionPlannerSnapshot;
};
