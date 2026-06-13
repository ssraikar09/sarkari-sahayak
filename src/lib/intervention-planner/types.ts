import type {
  CommandAlertPriority,
  InterventionRecommendation,
  NationalSnapshot,
} from "@/lib/command-center/types";

export type InterventionKind = InterventionRecommendation["intervention"];

export type PlannerIntervention = {
  id: string;
  kind: InterventionKind;
  title: string;
  priority: CommandAlertPriority;
  impactScore: number; // 0..100
  populationAffected: number;
  estimatedBenefitUnlockedINR: number;
  rationale: string;
  evidence: string[];
  sources: string[];
  contributingModules: string[];
  expectedImpact: string;
  causalPathway: string;
};

export type RoadmapMilestone = {
  title: string;
  detail: string;
};

export type RoadmapPhase = {
  window: "30-day" | "60-day" | "90-day";
  objective: string;
  activities: string[];
  stakeholders: string[];
  milestones: RoadmapMilestone[];
  successIndicators: string[];
};

export type InterventionRoadmap = {
  interventionId: string;
  phases: RoadmapPhase[];
};

export type ResourcePlan = {
  interventionId: string;
  cscOperators: number;
  documentationCamps: number;
  awarenessSessions: number;
  navigatorFacilitators: number;
  householdsExpectedToBenefit: number;
  notes: string[];
};

export type ImpactForecast = {
  interventionId: string;
  opportunityScoreLift: number;
  welfareReadinessLift: number;
  highRiskReductionPct: number;
  missedOpportunityReductionPct: number;
  annualBenefitIncreaseINR: number;
};

export type ImplementationRisk = {
  risk: string;
  severity: "high" | "medium" | "low";
  mitigation: string;
};

export type RiskAssessment = {
  interventionId: string;
  risks: ImplementationRisk[];
};

export type Explainer = {
  interventionId: string;
  why: string;
  datasets: string[];
  modules: string[];
  evidence: string[];
  causalPathway: string;
};

export type ComparisonRow = {
  interventionId: string;
  title: string;
  impactScore: number;
  resourceLoad: number; // 0..100 normalized
  timeToImplementWeeks: number;
  beneficiaryReach: number;
};

export type InterventionPlannerSnapshot = {
  generatedAt: string;
  hasSufficientData: boolean;
  interventions: PlannerIntervention[];
  roadmaps: InterventionRoadmap[];
  resources: ResourcePlan[];
  forecasts: ImpactForecast[];
  risks: RiskAssessment[];
  explainers: Explainer[];
  comparison: ComparisonRow[];
  aggregateForecast: {
    opportunityScoreLift: number;
    welfareReadinessLift: number;
    highRiskReductionPct: number;
    missedOpportunityReductionPct: number;
    annualBenefitIncreaseINR: number;
  };
  context: {
    householdsAnalyzed: number;
    averageOpportunityScore: number;
    welfareReadinessScore: number;
    highRiskPercentage: number;
    totalEligibleSchemes: number;
  };
  source: NationalSnapshot;
};
