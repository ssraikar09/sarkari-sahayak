export type LeverId =
  | "awareness"
  | "csc"
  | "documentation"
  | "navigatorAdoption"
  | "completion";

export type Levers = Record<LeverId, number>; // 0..100

export type LeverMeta = {
  id: LeverId;
  label: string;
  short: string;
  description: string;
  weight: number; // contribution weight on uptake of remaining missed schemes
  module: string; // referenced source module
};

export type DigitalTwinHousehold = {
  profileId: string;
  fullName: string;
  state: string;
  eligible: number;
  explored: number;
  navigatorEligible: number; // navigator-recommended ∩ eligible
  rankedMissedBenefits: number[]; // missed scheme annual benefits, sorted DESC
  exploredBenefitsINR: number;
  totalEligibleBenefitsINR: number;
};

export type DigitalTwinBaseline = {
  households: DigitalTwinHousehold[];
  generatedAt: string;
  // Aggregated snapshot
  totals: {
    households: number;
    averageOpportunityScore: number;
    averageMissedOpportunities: number;
    averageAnnualBenefitsINR: number;
    highRiskPct: number;
    welfareReadinessScore: number; // 100 - highRiskPct adjusted by avg score
    navigatorAdoptionPct: number;
    csCoverageProxyPct: number; // explored/eligible proxy
  };
  hasSufficientData: boolean;
};

export type RiskDistribution = { high: number; moderate: number; low: number };

export type LeverContribution = {
  id: LeverId;
  label: string;
  contributionPct: number; // share of overall lift attributable to this lever (0..100)
  scoreLift: number;
  benefitLiftINR: number;
};

export type DigitalTwinForecast = {
  levers: Levers;
  simulated: {
    averageOpportunityScore: number;
    averageMissedOpportunities: number;
    averageAnnualBenefitsINR: number;
    highRiskPct: number;
    welfareReadinessScore: number;
    navigatorAdoptionPct: number;
    csCoverageProxyPct: number;
  };
  deltas: {
    opportunityScore: number;
    missedReduction: number;
    benefitGainINR: number;
    riskReductionPct: number;
    readinessLift: number;
  };
  currentRisk: RiskDistribution;
  simulatedRisk: RiskDistribution;
  contributions: LeverContribution[];
  trajectory: { step: number; score: number; readiness: number; risk: number }[];
  benefitProjection: { step: number; benefitINR: number }[];
  generatedAt: string;
};

export type ScenarioPresetId =
  | "csc-coverage"
  | "docs-support"
  | "awareness-boost"
  | "digital-adoption"
  | "full-optimization";

export type ScenarioPreset = {
  id: ScenarioPresetId;
  label: string;
  description: string;
  levers: Levers;
};

export type Explainer = {
  id: string;
  headline: string;
  rationale: string;
  evidence: string[];
  sources: string[];
};

export type AuditTrail = {
  inputs: Levers;
  formulas: { name: string; formula: string }[];
  sources: string[];
  timestamp: string;
};
