import type { EligibilityRecommendation } from "@/lib/eligibility";

export const RELATIONSHIPS = [
  "Father",
  "Mother",
  "Son",
  "Daughter",
  "Grandfather",
  "Grandmother",
  "Spouse",
  "Other",
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];

export type FamilyMemberInput = {
  full_name: string;
  relationship: string;
  age: number;
  gender: string;
  occupation: string;
  annual_income: string;
  education_level: string;
  disability_status: boolean;
};

export type FamilyMember = FamilyMemberInput & {
  id: string;
  citizen_profile_id: string;
  created_at: string;
};

export type FamilyMemberRecommendations = {
  member: FamilyMember;
  recommendations: EligibilityRecommendation[];
};

export type FamilyAssessment = {
  members: FamilyMemberRecommendations[];
  totalRecommendations: number;
  categoryBreakdown: Record<string, number>;
  generatedAt: string;
};
