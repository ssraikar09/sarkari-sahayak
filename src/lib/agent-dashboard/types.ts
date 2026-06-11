import type { WelfareCoverageTier } from "@/lib/welfare-gap/types";

export type AgentOverview = {
  totalCitizensAssisted: number;
  totalHouseholdsManaged: number;
  totalEligibilityAssessments: number;
  totalGuidesGenerated: number;
  totalNavigatorPlans: number;
};

export type AgentAnalytics = {
  topGoals: { goal: string; count: number }[];
  topRecommendedCategories: { category: string; count: number }[];
  averageOpportunityScore: number;
  averageAnnualBenefitINR: number;
};

export type AgentSnapshot = {
  overview: AgentOverview;
  analytics: AgentAnalytics;
  generatedAt: string;
};

export type CitizenRegistryEntry = {
  id: string;
  fullName: string;
  state: string;
  district: string;
  age: number;
  occupation: string;
  preferredLanguage: string;
  familyMemberCount: number;
  hasAssessment: boolean;
  createdAt: string;
};

export type ApplicationStatus =
  | "Not Started"
  | "In Progress"
  | "Submitted"
  | "Completed";

export type CitizenWorkflow = {
  citizenProfileId: string;
  guidesOpened: number;
  summariesDownloaded: number;
  navigatorPlansGenerated: number;
  applicationStatus: ApplicationStatus;
};

export type CitizenAssistanceRow = {
  citizen: CitizenRegistryEntry;
  workflow: CitizenWorkflow;
  household: {
    opportunityScore: number;
    tier: WelfareCoverageTier;
    missedOpportunities: number;
    estimatedAnnualBenefitINR: number;
    riskCategory: "High" | "Moderate" | "Low";
  };
};
