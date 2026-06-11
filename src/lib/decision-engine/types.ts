import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type { CriterionEvaluation } from "@/lib/eligibility";
import type { FamilyMember } from "@/lib/family-planner";

export type DecisionStatus = "eligible" | "partial" | "not_eligible";

export type DecisionConfidence = {
  score: number; // 0-100
  label: "Strong Match" | "Moderate Match" | "Weak Match" | "No Match";
};

export type SchemeDecision = {
  scheme: GovernmentScheme;
  status: DecisionStatus;
  matched: CriterionEvaluation[];
  unmet: CriterionEvaluation[];
  evidence: CriterionEvaluation[]; // matched + unmet (applicable only)
  confidence: DecisionConfidence;
};

export type DecisionOverview = {
  total: number;
  eligible: number;
  partial: number;
  notEligible: number;
  eligiblePct: number;
  partialPct: number;
  notEligiblePct: number;
};

export type DecisionReport = {
  profile: CitizenProfile;
  overview: DecisionOverview;
  decisions: SchemeDecision[];
  generatedAt: string;
};

export type HouseholdMemberDecision = {
  member: FamilyMember;
  overview: DecisionOverview;
  topEligible: SchemeDecision[];
  topMissed: SchemeDecision[];
};

export type DecisionTimelineEvent = {
  key:
    | "profile_created"
    | "eligibility_assessment"
    | "family_analysis"
    | "navigator_plan"
    | "application_guidance";
  label: string;
  occurredAt: string | null;
  count: number;
  completed: boolean;
};

export type WhyNotExplanation = {
  scheme: GovernmentScheme;
  status: DecisionStatus;
  missingCriteria: CriterionEvaluation[];
  matchedCriteria: CriterionEvaluation[];
  summary: string;
  suggestedActions: string[];
};
