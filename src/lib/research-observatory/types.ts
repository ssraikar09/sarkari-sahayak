export type ResearchSnapshotMetrics = {
  householdsStudied: number;
  schemesAnalyzed: number;
  goalCategoriesCovered: number;
  highRiskSharePercent: number;
  averageOpportunityScore: number;
  averageProjectedBenefitINR: number;
};

export type CategoryMetric = { category: string; count: number; percent: number };

export type ConcentrationRow = {
  label: string;
  value: number;
  share: number; // 0..1
};

export type TrendObservatory = {
  missedByCategory: CategoryMetric[];
  utilizationGaps: {
    category: string;
    eligible: number;
    explored: number;
    gapPercent: number;
  }[];
  benefitConcentration: ConcentrationRow[];
  riskConcentration: ConcentrationRow[];
};

export type ArchetypeKey =
  | "digitally-excluded"
  | "high-benefit-potential"
  | "women-centric-need"
  | "agricultural-vulnerability"
  | "senior-citizen-support"
  | "student-opportunity-cluster";

export type HouseholdArchetype = {
  key: ArchetypeKey;
  name: string;
  description: string;
  households: number;
  potentialBenefitPoolINR: number;
  contributingSignals: string[];
};

export type ResearchFinding = {
  id: string;
  title: string;
  narrative: string;
  magnitude: string;
  contributingModules: string[];
  datasets: string[];
  category: "exclusion" | "opportunity" | "demographic" | "utilization" | "risk";
};

export type ResearchSnapshot = {
  metrics: ResearchSnapshotMetrics;
  trends: TrendObservatory;
  archetypes: HouseholdArchetype[];
  findings: ResearchFinding[];
  generatedAt: string;
  hasSufficientData: boolean;
};
