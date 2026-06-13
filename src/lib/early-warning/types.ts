import type { NationalSnapshot } from "@/lib/command-center/types";

export type WarningSeverity = "critical" | "high" | "moderate" | "low";

export type WarningCategory =
  | "documentation-delay"
  | "low-engagement"
  | "repeated-misses"
  | "declining-readiness"
  | "benefit-expiration"
  | "women-underutilization"
  | "student-inactivity"
  | "senior-non-enrollment";

export type PreventiveAction =
  | "documentation-camp"
  | "awareness-drive"
  | "scheme-promotion"
  | "csc-outreach"
  | "navigator-engagement";

export type EarlyWarningAlert = {
  id: string;
  title: string;
  category: WarningCategory;
  categoryLabel: string;
  region: string;
  severity: WarningSeverity;
  signalScore: number; // 0..100 deterministic
  householdsAffected: number;
  potentialBenefitLossINR: number;
  recommendedActions: PreventiveAction[];
  recommendedActionLabels: string[];
  triggeringConditions: string[];
  contributingModules: string[];
  referencedDatasets: string[];
  rationale: string;
  evidence: string[];
};

export type WarningTrendBucket = {
  label: string;
  count: number;
  households: number;
};

export type WarningTrends = {
  categoryDistribution: WarningTrendBucket[];
  regionConcentration: WarningTrendBucket[];
  severityComposition: WarningTrendBucket[];
};

export type EarlyWarningSnapshot = {
  generatedAt: string;
  hasSufficientData: boolean;
  summary: {
    activeAlerts: number;
    highPriorityAlerts: number;
    householdsAtEmergingRisk: number;
    benefitsAtRiskINR: number;
  };
  alerts: EarlyWarningAlert[];
  trends: WarningTrends;
  context: {
    householdsAnalyzed: number;
    averageOpportunityScore: number;
    welfareReadinessScore: number;
    highRiskPercentage: number;
  };
  source: NationalSnapshot;
};
