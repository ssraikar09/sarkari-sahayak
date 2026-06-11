export type CategoryCount = { category: string; count: number };
export type SchemeCount = { id: string; name: string; count: number };
export type GoalCount = { goal: string; count: number };

export type WelfareTrends = {
  searchedCategories: CategoryCount[];
  recommendedCategories: CategoryCount[];
  topGuides: SchemeCount[];
  navigatorGoals: GoalCount[];
};

export type HouseholdStats = {
  profilesAnalyzed: number;
  averageOpportunityScore: number;
  averageMissedOpportunities: number;
  averageEstimatedAnnualBenefits: number;
};

export type SchemeUtilization = {
  topViewedSchemes: SchemeCount[];
  topDownloadedSummaries: SchemeCount[];
  topActionPlanSchemes: SchemeCount[];
};

export type RiskDistribution = {
  high: number;
  moderate: number;
  low: number;
  total: number;
};

export type InsightsSnapshot = {
  trends: WelfareTrends;
  household: HouseholdStats;
  utilization: SchemeUtilization;
  risk: RiskDistribution;
  generatedAt: string;
};
