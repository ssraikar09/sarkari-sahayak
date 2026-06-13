import type {
  ComparisonRow,
  Explainer,
  ImplementationRisk,
  InterventionKind,
  PlannerIntervention,
  RiskAssessment,
} from "./types";
import type { ResourcePlan } from "./types";

const KIND_DATASETS: Record<InterventionKind, string[]> = {
  "csc-outreach": [
    "eligibility_assessments",
    "citizen_profiles",
    "agent_dashboard.analytics",
  ],
  "documentation-assistance": [
    "application_guide_usage",
    "eligibility_assessments",
  ],
  "awareness-campaign": [
    "government_schemes",
    "scheme_search_logs",
    "navigator_usage_logs",
  ],
  "navigator-onboarding": [
    "navigator_usage_logs",
    "eligibility_assessments",
  ],
  "scheme-promotion": [
    "government_schemes",
    "eligibility_assessments",
    "policy_intelligence",
  ],
};

export function buildExplainers(interventions: PlannerIntervention[]): Explainer[] {
  return interventions.map((iv) => ({
    interventionId: iv.id,
    why: `${iv.rationale} Prioritized at "${iv.priority}" with an impact score of ${iv.impactScore}/100.`,
    datasets: KIND_DATASETS[iv.kind],
    modules: iv.contributingModules,
    evidence: iv.evidence,
    causalPathway: iv.causalPathway,
  }));
}

const KIND_RISKS: Record<InterventionKind, ImplementationRisk[]> = {
  "csc-outreach": [
    {
      risk: "Limited CSC coverage in remote blocks",
      severity: "high",
      mitigation: "Pair operators with mobile camps; partner with NGOs for last-mile reach.",
    },
    {
      risk: "Operator attrition",
      severity: "medium",
      mitigation: "Introduce performance-linked incentives and quarterly recognition.",
    },
  ],
  "documentation-assistance": [
    {
      risk: "Documentation bottlenecks at issuing authorities",
      severity: "high",
      mitigation: "Coordinate certificate drives with revenue and panchayat offices.",
    },
    {
      risk: "Language accessibility gaps in checklists",
      severity: "medium",
      mitigation: "Provide regional language checklists via the Application Guide module.",
    },
  ],
  "awareness-campaign": [
    {
      risk: "Low digital adoption in target households",
      severity: "high",
      mitigation: "Blend offline channels — community meetings, radio, posters.",
    },
    {
      risk: "Message fatigue / generic creatives",
      severity: "medium",
      mitigation: "Localize creatives per district and rotate based on response.",
    },
  ],
  "navigator-onboarding": [
    {
      risk: "Households unaware of navigator value",
      severity: "medium",
      mitigation: "Auto-trigger navigator suggestion after every eligibility assessment.",
    },
    {
      risk: "Operator workload growth",
      severity: "medium",
      mitigation: "Track navigator runs on agent dashboard with workload caps.",
    },
  ],
  "scheme-promotion": [
    {
      risk: "Promoted schemes still blocked by documentation",
      severity: "medium",
      mitigation: "Pair promotion with documentation assistance camps.",
    },
    {
      risk: "Language accessibility gaps in promotion content",
      severity: "low",
      mitigation: "Use regional translations already supported by the assistant.",
    },
  ],
};

export function buildRisks(interventions: PlannerIntervention[]): RiskAssessment[] {
  return interventions.map((iv) => ({
    interventionId: iv.id,
    risks: KIND_RISKS[iv.kind],
  }));
}

const KIND_TIMELINE_WEEKS: Record<InterventionKind, number> = {
  "csc-outreach": 12,
  "documentation-assistance": 10,
  "awareness-campaign": 6,
  "navigator-onboarding": 8,
  "scheme-promotion": 4,
};

export function buildComparison(
  interventions: PlannerIntervention[],
  resources: ResourcePlan[],
): ComparisonRow[] {
  const resourceById = new Map(resources.map((r) => [r.interventionId, r]));
  const rawLoads = interventions.map((iv) => {
    const r = resourceById.get(iv.id);
    if (!r) return { id: iv.id, load: 0 };
    const load =
      r.cscOperators * 4 +
      r.documentationCamps * 2 +
      r.awarenessSessions +
      r.navigatorFacilitators * 3;
    return { id: iv.id, load };
  });
  const maxLoad = Math.max(1, ...rawLoads.map((r) => r.load));
  const loadById = new Map(
    rawLoads.map((r) => [r.id, Math.round((r.load / maxLoad) * 100)]),
  );

  return interventions.map((iv) => {
    const res = resourceById.get(iv.id);
    return {
      interventionId: iv.id,
      title: iv.title,
      impactScore: iv.impactScore,
      resourceLoad: loadById.get(iv.id) ?? 0,
      timeToImplementWeeks: KIND_TIMELINE_WEEKS[iv.kind],
      beneficiaryReach: res?.householdsExpectedToBenefit ?? 0,
    };
  });
}
