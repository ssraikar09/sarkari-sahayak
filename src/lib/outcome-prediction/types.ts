export type RiskTier = "high" | "moderate" | "low";

export type ScenarioId = "top3" | "all" | "navigator" | "documentation";

export type ScenarioMeta = {
  id: ScenarioId;
  label: string;
  description: string;
  actions: string[];
};

export type HouseholdSnapshot = {
  profileId: string;
  fullName: string;
  state: string;
  eligibleCount: number;
  exploredCount: number;
  missedCount: number;
  currentScore: number;
  currentBenefitsINR: number;
  currentRisk: RiskTier;
};

export type HouseholdScenarioOutcome = {
  scenarioId: ScenarioId;
  predictedExploredCount: number;
  predictedScore: number;
  predictedBenefitsINR: number;
  predictedRisk: RiskTier;
  scoreDelta: number;
  benefitsDeltaINR: number;
  missedReduction: number;
  riskImproved: boolean;
};

export type HouseholdOutcome = {
  snapshot: HouseholdSnapshot;
  scenarios: HouseholdScenarioOutcome[];
};

export type SummaryDashboard = {
  households: number;
  currentAverageScore: number;
  predictedAverageScore: number;
  currentAverageBenefitsINR: number;
  predictedAverageBenefitsINR: number;
  currentHighRisk: number;
  predictedHighRisk: number;
  currentHighRiskPct: number;
  predictedHighRiskPct: number;
};

export type ScenarioForecast = {
  id: ScenarioId;
  label: string;
  description: string;
  actions: string[];
  predictedAverageScore: number;
  predictedAverageBenefitsINR: number;
  averageScoreLift: number;
  averageBenefitLiftINR: number;
  averageMissedReduction: number;
  readinessLiftPct: number; // % of households that moved out of high-risk
  affectedHouseholds: number;
};

export type CategoryImpact = {
  category: string;
  predictedBenefitGainINR: number;
  affectedHouseholds: number;
};

export type ResearchInsights = {
  averagePredictedBenefitGainINR: number;
  averagePredictedRiskReductionPct: number;
  mostImpactfulCategories: CategoryImpact[];
};

export type Explainer = {
  id: string;
  prediction: string;
  rationale: string;
  actions: string[];
  sources: string[];
};

export type OutcomePredictionSnapshot = {
  summary: SummaryDashboard;
  scenarios: ScenarioForecast[];
  households: HouseholdOutcome[];
  research: ResearchInsights;
  explainers: Explainer[];
  generatedAt: string;
  hasSufficientData: boolean;
};
