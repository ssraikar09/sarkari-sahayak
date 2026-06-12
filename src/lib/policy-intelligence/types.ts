export type CategoryCount = { category: string; count: number };
export type SchemeCount = { id: string; name: string; count: number };
export type GoalCount = { goal: string; count: number };
export type StateCount = { state: string; count: number };

export type GroupExclusion = {
  group: string;
  affectedHouseholds: number;
  averageMissed: number;
  averageOpportunityScore: number;
};

export type UnderutilizedScheme = {
  id: string;
  name: string;
  category: string;
  eligibleCount: number;
  exploredCount: number;
  utilizationRate: number; // 0..1
};

export type StateRiskRow = {
  state: string;
  households: number;
  averageOpportunityScore: number;
  high: number;
  moderate: number;
  low: number;
};

export type StateDemandRow = {
  state: string;
  topCategory: string;
  topGoal: string;
  totalInteractions: number;
};

export type NationalOverview = {
  householdsAnalyzed: number;
  averageOpportunityScore: number;
  averageMissedOpportunities: number;
  averageEstimatedAnnualBenefitsINR: number;
  highRiskPercentage: number;
};

export type WelfareTrends = {
  navigatorGoals: GoalCount[];
  recommendedCategories: CategoryCount[];
  topDownloadedReports: SchemeCount[];
  topExploredGuides: SchemeCount[];
};

export type RiskDistribution = {
  high: number;
  moderate: number;
  low: number;
  total: number;
};

export type PolicyRecommendation = {
  id: string;
  title: string;
  rationale: string;
  evidence: string[];
  sources: string[];
  priority: "high" | "medium" | "low";
};

export type PolicyIntelligenceSnapshot = {
  overview: NationalOverview;
  exclusion: {
    topMissedCategories: CategoryCount[];
    underutilizedSchemes: UnderutilizedScheme[];
    underservedGroups: GroupExclusion[];
  };
  regional: {
    demand: StateDemandRow[];
    risk: StateRiskRow[];
  };
  trends: WelfareTrends;
  risk: RiskDistribution;
  recommendations: PolicyRecommendation[];
  generatedAt: string;
  hasSufficientData: boolean;
};
