import type {
  NationalOverview,
  StateRiskRow,
  StateDemandRow,
  UnderutilizedScheme,
  PolicyRecommendation,
  RiskDistribution,
  WelfareTrends,
} from "@/lib/policy-intelligence/types";

export type CommandAlertPriority = "critical" | "high" | "medium" | "low";

export type CommandAlert = {
  id: string;
  title: string;
  region: string;
  category:
    | "welfare-exclusion"
    | "low-utilization"
    | "documentation-barrier"
    | "navigator-adoption"
    | "category-gap";
  priority: CommandAlertPriority;
  metric: string;
  rationale: string;
  evidence: string[];
  sources: string[];
};

export type InterventionRecommendation = {
  id: string;
  title: string;
  intervention:
    | "csc-outreach"
    | "documentation-assistance"
    | "awareness-campaign"
    | "navigator-onboarding"
    | "scheme-promotion";
  rationale: string;
  evidence: string[];
  sources: string[];
  expectedImpact: string;
  priority: CommandAlertPriority;
};

export type StateLeaderboardRow = {
  state: string;
  households: number;
  opportunityScore: number;
  highRiskPercentage: number;
  estimatedBenefitsUnlockedINR: number;
  welfareReadinessScore: number;
};

export type WelfareGoalCategory =
  | "Education"
  | "Healthcare"
  | "Women's Empowerment"
  | "Entrepreneurship"
  | "Senior Citizen Welfare";

export type WelfareGoalProgress = {
  goal: WelfareGoalCategory;
  eligibleSchemes: number;
  exploredOccurrences: number;
  utilizationPercent: number; // 0..100
  navigatorDemand: number;
};

export type UnderperformingScheme = {
  id: string;
  name: string;
  category: string;
  eligibleHouseholds: number;
  utilizationPercent: number;
  opportunityGap: number;
};

export type NationalSnapshot = {
  overview: NationalOverview & {
    totalEligibleSchemes: number;
    totalEstimatedBenefitsUnlockedINR: number;
    welfareReadinessScore: number;
  };
  leaderboard: StateLeaderboardRow[];
  alerts: CommandAlert[];
  interventions: InterventionRecommendation[];
  trends: WelfareTrends;
  underperformingSchemes: UnderperformingScheme[];
  goals: WelfareGoalProgress[];
  risk: RiskDistribution;
  regional: { demand: StateDemandRow[]; risk: StateRiskRow[] };
  upstreamRecommendations: PolicyRecommendation[];
  underutilizedSchemes: UnderutilizedScheme[];
  generatedAt: string;
  hasSufficientData: boolean;
};
