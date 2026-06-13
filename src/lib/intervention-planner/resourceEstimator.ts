import type { PlannerIntervention, ResourcePlan, InterventionKind } from "./types";

type ResourceProfile = {
  operatorsPer1000: number;
  campsPer1000: number;
  sessionsPer1000: number;
  facilitatorsPer1000: number;
  benefitRate: number; // share of populationAffected expected to benefit
  notes: string[];
};

const PROFILES: Record<InterventionKind, ResourceProfile> = {
  "csc-outreach": {
    operatorsPer1000: 2,
    campsPer1000: 0.5,
    sessionsPer1000: 0.3,
    facilitatorsPer1000: 0.2,
    benefitRate: 0.55,
    notes: [
      "Operator estimates assume 500 assessed households per operator per quarter.",
      "Camps are full-day on-ground sessions in priority panchayats.",
    ],
  },
  "documentation-assistance": {
    operatorsPer1000: 1,
    campsPer1000: 1.2,
    sessionsPer1000: 0.4,
    facilitatorsPer1000: 0.3,
    benefitRate: 0.6,
    notes: [
      "Camps are joint drives with certificate-issuing authorities.",
      "Each camp targets ~400 households over 2 days.",
    ],
  },
  "awareness-campaign": {
    operatorsPer1000: 0.3,
    campsPer1000: 0.4,
    sessionsPer1000: 1.5,
    facilitatorsPer1000: 0.4,
    benefitRate: 0.35,
    notes: [
      "Sessions cover village meetings, SMS bursts and radio segments.",
      "Conversion rates are conservative; reinforce with operator follow-up.",
    ],
  },
  "navigator-onboarding": {
    operatorsPer1000: 1.5,
    campsPer1000: 0.2,
    sessionsPer1000: 0.6,
    facilitatorsPer1000: 1.5,
    benefitRate: 0.65,
    notes: [
      "Facilitators co-run the navigator with households during CSC visits.",
      "Sessions include onboarding clinics for new households.",
    ],
  },
  "scheme-promotion": {
    operatorsPer1000: 0.5,
    campsPer1000: 0.2,
    sessionsPer1000: 0.8,
    facilitatorsPer1000: 0.3,
    benefitRate: 0.4,
    notes: [
      "Promotion leverages existing assistant and dashboard surfaces.",
      "Pair with documentation support for the highest yield.",
    ],
  },
};

export function buildResourcePlans(interventions: PlannerIntervention[]): ResourcePlan[] {
  return interventions.map((iv) => {
    const p = PROFILES[iv.kind];
    const per1000 = iv.populationAffected / 1000;
    const round = (n: number) => Math.max(0, Math.ceil(n));
    return {
      interventionId: iv.id,
      cscOperators: round(per1000 * p.operatorsPer1000),
      documentationCamps: round(per1000 * p.campsPer1000),
      awarenessSessions: round(per1000 * p.sessionsPer1000),
      navigatorFacilitators: round(per1000 * p.facilitatorsPer1000),
      householdsExpectedToBenefit: Math.round(iv.populationAffected * p.benefitRate),
      notes: p.notes,
    };
  });
}
