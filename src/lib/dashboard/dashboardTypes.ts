export type CategoryKey =
  | "Farmer"
  | "Women"
  | "Student"
  | "Senior Citizen"
  | "Entrepreneur"
  | "Health & Social Security"
  | "Other";

export type PersonalImpact = {
  totalEligible: number;
  national: number;
  state: number;
  family: number;
  byCategory: Record<CategoryKey, number>;
  hasProfile: boolean;
  hasAssessment: boolean;
};

export type HouseholdImpact = {
  familyMemberCount: number;
  familyRecommendations: number;
  familyByCategory: Record<CategoryKey, number>;
};

export type AssistantInsights = {
  totalQueries: number;
  topCategories: { category: string; count: number }[];
  topSchemes: { id: string; name: string; count: number }[];
};

export type ApplicationProgress = {
  guidesOpened: number;
  summariesDownloaded: number;
};

export type DashboardSnapshot = {
  personal: PersonalImpact;
  household: HouseholdImpact;
  assistant: AssistantInsights;
  progress: ApplicationProgress;
};
