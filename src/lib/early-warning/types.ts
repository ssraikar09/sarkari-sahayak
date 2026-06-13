import type { NationalSnapshot } from "@/lib/command-center/types";

export type WarningSeverity = "critical" | "high" | "moderate" | "low";

export type WarningConfidence = "high" | "medium" | "low";

export type WarningLifecycle = "emerging" | "escalating" | "critical" | "mitigated";

export type WarningCategory =
  | "documentation-delay"
  | "low-engagement"
  | "repeated-misses"
  | "declining-readiness"
  | "benefit-expiration"
  | "women-underutilization"
  | "student-inactivity"
  | "senior-non-enrollment"
  | "farmer-adoption-decline"
  | "high-risk-concentration"
  | "navigator-engagement-risk";

export type PreventiveAction =
  | "documentation-camp"
  | "awareness-drive"
  | "scheme-promotion"
  | "csc-outreach"
  | "navigator-engagement"
  | "beneficiary-verification"
  | "district-review";

export type EarlyWarningAlert = {
  id: string;
  title: string;
  category: WarningCategory;
  categoryLabel: string;
  region: string;
  severity: WarningSeverity;
  signalScore: number; // 0..100 deterministic
  confidence: WarningConfidence;
  lifecycle: WarningLifecycle;
  householdsAffected: number;
  potentialBenefitLossINR: number;
  recommendedActions: PreventiveAction[];
  recommendedActionLabels: string[];
  triggeringConditions: string[];
  deterministicRules: string[];
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
  lifecycleDistribution: WarningTrendBucket[];
};

export type EarlyWarningSnapshot = {
  generatedAt: string;
  hasSufficientData: boolean;
  summary: {
    activeAlerts: number;
    criticalAlerts: number;
    highPriorityAlerts: number;
    householdsUnderObservation: number;
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
