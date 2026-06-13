import type {
  NationalSnapshot,
  InterventionRecommendation,
} from "@/lib/command-center/types";
import type { PlannerIntervention, InterventionKind } from "./types";

const PRIORITY_WEIGHT: Record<PlannerIntervention["priority"], number> = {
  critical: 100,
  high: 80,
  medium: 60,
  low: 40,
};

const KIND_MODULES: Record<InterventionKind, string[]> = {
  "csc-outreach": [
    "Policy Intelligence Engine",
    "National Welfare Command Center",
    "Welfare Research Observatory",
  ],
  "documentation-assistance": [
    "Policy Intelligence Engine",
    "Outcome Prediction Engine",
    "National Welfare Command Center",
  ],
  "awareness-campaign": [
    "Policy Intelligence Engine",
    "Welfare Digital Twin Simulator",
    "National Welfare Command Center",
  ],
  "navigator-onboarding": [
    "Outcome Prediction Engine",
    "Welfare Digital Twin Simulator",
    "National Welfare Command Center",
  ],
  "scheme-promotion": [
    "Policy Intelligence Engine",
    "Welfare Research Observatory",
    "National Welfare Command Center",
  ],
};

const KIND_CAUSAL: Record<InterventionKind, string> = {
  "csc-outreach":
    "CSC operators on the ground convert eligibility into applications, lifting opportunity scores in low-performing states.",
  "documentation-assistance":
    "Removing documentation friction allows already-eligible households to complete scheme applications they currently abandon.",
  "awareness-campaign":
    "Targeted communications close the awareness gap for schemes with high eligibility but low utilization.",
  "navigator-onboarding":
    "Navigator usage converts assessed eligibility into concrete action plans, increasing schemes explored per household.",
  "scheme-promotion":
    "Promoting high-benefit underutilized schemes shifts the national opportunity score upward without new infrastructure.",
};

export function buildPlannerInterventions(
  snap: NationalSnapshot,
): PlannerIntervention[] {
  const base: InterventionRecommendation[] = snap.interventions;
  const households = Math.max(1, snap.overview.householdsAnalyzed);
  const benefitsUnlocked = snap.overview.totalEstimatedBenefitsUnlockedINR;
  const benefitGapINR = Math.max(
    0,
    Math.round((benefitsUnlocked / Math.max(1, snap.overview.averageOpportunityScore)) * 100) -
      benefitsUnlocked,
  );

  const exclusionStates = snap.alerts.filter((a) => a.category === "welfare-exclusion").length;
  const docAlerts = snap.alerts.filter((a) => a.category === "documentation-barrier").length;
  const lowUtilAlerts = snap.alerts.filter((a) => a.category === "low-utilization").length;

  return base.map((r) => {
    const priorityScore = PRIORITY_WEIGHT[r.priority];
    let populationAffected = 0;
    let benefitShare = 0;
    let impactBoost = 0;

    switch (r.intervention) {
      case "csc-outreach": {
        populationAffected = Math.round(households * Math.min(1, 0.15 + exclusionStates * 0.05));
        benefitShare = 0.18;
        impactBoost = exclusionStates * 4;
        break;
      }
      case "documentation-assistance": {
        populationAffected = Math.round(households * Math.min(1, 0.2 + docAlerts * 0.07));
        benefitShare = 0.22;
        impactBoost = docAlerts * 5;
        break;
      }
      case "awareness-campaign": {
        populationAffected = Math.round(households * Math.min(1, 0.25 + lowUtilAlerts * 0.04));
        benefitShare = 0.16;
        impactBoost = lowUtilAlerts * 3;
        break;
      }
      case "navigator-onboarding": {
        populationAffected = Math.round(households * 0.4);
        benefitShare = 0.12;
        impactBoost = 6;
        break;
      }
      case "scheme-promotion": {
        populationAffected = Math.round(households * 0.3);
        benefitShare = 0.14;
        impactBoost = 4;
        break;
      }
    }

    const estimatedBenefitUnlockedINR =
      Math.round(benefitsUnlocked * benefitShare) + Math.round(benefitGapINR * benefitShare * 0.5);
    const impactScore = Math.min(100, Math.round(priorityScore * 0.7 + impactBoost + 5));

    return {
      id: r.id,
      kind: r.intervention,
      title: r.title,
      priority: r.priority,
      impactScore,
      populationAffected,
      estimatedBenefitUnlockedINR,
      rationale: r.rationale,
      evidence: r.evidence,
      sources: r.sources,
      contributingModules: KIND_MODULES[r.intervention],
      expectedImpact: r.expectedImpact,
      causalPathway: KIND_CAUSAL[r.intervention],
    };
  })
    .sort(
      (a, b) =>
        b.impactScore - a.impactScore ||
        b.estimatedBenefitUnlockedINR - a.estimatedBenefitUnlockedINR ||
        a.id.localeCompare(b.id),
    );
}
