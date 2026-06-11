export type MissedSchemeReason =
  | "eligible_not_explored"
  | "demographic_match"
  | "related_category_viewed";

export type EstimatedSchemeBenefit = {
  schemeId: string;
  schemeName: string;
  category: string;
  annualValueINR: number;
  /** Whether the value is a published number vs. a category-based estimate. */
  basis: "known" | "estimated";
};

export type MissedScheme = {
  schemeId: string;
  schemeName: string;
  category: string;
  scope: "National" | "State";
  annualValueINR: number;
  reasons: MissedSchemeReason[];
  reasonText: string;
};

export type MemberGap = {
  memberId: string;
  name: string;
  relationship: string;
  eligibleCount: number;
  exploredCount: number;
  missedCount: number;
  missedSchemes: MissedScheme[];
};

export type WelfareCoverageTier =
  | "Excellent Welfare Coverage"
  | "Moderate Welfare Coverage"
  | "High Risk of Welfare Exclusion";

export type HouseholdInsight = {
  id: string;
  title: string;
  detail: string;
};

export type WelfareGapAnalysis = {
  hasData: boolean;
  members: MemberGap[];
  household: {
    totalEligible: number;
    totalExplored: number;
    totalMissed: number;
  };
  score: number;
  tier: WelfareCoverageTier;
  estimatedAnnualBenefitINR: number;
  topMissedByValue: MissedScheme[];
  insights: HouseholdInsight[];
};
