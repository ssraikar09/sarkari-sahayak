import type { GovernmentScheme } from "@/lib/schemes";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";

export type EligibilityCriterion =
  | "state"
  | "occupation"
  | "income"
  | "age"
  | "disability";

export type CriterionEvaluation = {
  criterion: EligibilityCriterion;
  matched: boolean;
  /** Whether this criterion is relevant to the given scheme. */
  applicable: boolean;
  reason: string;
};

export type ConfidenceLabel = "High Match" | "Medium Match" | "Low Match";

export type EligibilityRecommendation = {
  scheme: GovernmentScheme;
  matchedCount: number;
  totalApplicable: number;
  confidence: ConfidenceLabel;
  reasons: CriterionEvaluation[];
};

export type EligibilityAssessment = {
  profile: CitizenProfile;
  recommendations: EligibilityRecommendation[];
  generatedAt: string;
};

export type AgeGroup =
  | "Child"
  | "Youth"
  | "Adult"
  | "Senior"
  | "Super Senior";

export type IncomeBracketKey =
  | "very_low"
  | "low"
  | "middle"
  | "high";
