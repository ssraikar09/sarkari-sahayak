import type { GovernmentScheme } from "@/lib/schemes";

export type CachedScheme = {
  id: string;
  scheme_name: string;
  state: string;
  category: string;
  scheme_scope: string;
  description: string;
  eligibility_criteria: string;
  benefits: string;
  required_documents: string;
  application_process: string | null;
  official_link: string | null;
  cached_at: string;
};

export type CachedApplicationGuide = {
  schemeId: string;
  schemeName: string;
  mode: string;
  estimatedProcessingTime: string;
  documents: string[];
  steps: { index: number; title: string; detail?: string }[];
  officialLink: string | null;
  cached_at: string;
};

export type CachedInterventionPlan = {
  id: string;
  title: string;
  priority: string;
  impactScore: number;
  populationAffected: number;
  rationale: string;
  expectedImpact: string;
  cached_at: string;
};

export type OfflineCache = {
  schemes: CachedScheme[];
  guides: CachedApplicationGuide[];
  interventions: CachedInterventionPlan[];
  lastSyncedAt: string | null;
  lastSyncStatus: "success" | "failed" | "never";
  lastSyncMessage: string | null;
};

export type OfflineEligibilityInput = {
  state: string;
  occupation: string;
  age: number;
  annual_income: string;
  disability_status: boolean;
};

export type OfflineEligibilityMatch = {
  schemeId: string;
  schemeName: string;
  category: string;
  scope: string;
  matchedSignals: string[];
  confidence: "high" | "medium" | "low";
};

export type OfflineEligibilityResult = {
  generatedAt: string;
  input: OfflineEligibilityInput;
  matches: OfflineEligibilityMatch[];
  basedOnCachedSchemes: number;
  disclaimer: string;
};

export type { GovernmentScheme };
