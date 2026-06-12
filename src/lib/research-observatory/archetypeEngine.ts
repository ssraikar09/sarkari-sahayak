import type { HouseholdArchetype, ArchetypeKey } from "./types";

export type ProfileRecord = {
  id: string;
  age: number;
  gender: string;
  occupation: string;
  education_level: string;
  disability_status: boolean;
};

export type SchemeRecord = {
  id: string;
  scheme_name: string;
  category: string;
  benefits: string | null;
};

export type ArchetypeInput = {
  profiles: ProfileRecord[];
  eligibleByProfile: Map<string, string[]>;
  exploredByProfile: Map<string, Set<string>>;
  schemeIndex: Map<string, SchemeRecord>;
  estimate: (s: SchemeRecord) => number;
};

type ArchetypeDef = {
  key: ArchetypeKey;
  name: string;
  description: string;
  signals: string[];
  match: (p: ProfileRecord, ctx: { eligible: string[]; explored: Set<string>; missed: string[]; opportunity: number }) => boolean;
};

const ARCHETYPES: ArchetypeDef[] = [
  {
    key: "digitally-excluded",
    name: "Digitally Excluded",
    description:
      "Households with verified eligibility but no recorded engagement with application guides or the welfare navigator.",
    signals: [
      "Eligibility assessments present",
      "Zero application_guide_usage events",
      "Zero navigator_usage_logs interactions",
    ],
    match: (_p, ctx) => ctx.eligible.length > 0 && ctx.explored.size === 0,
  },
  {
    key: "high-benefit-potential",
    name: "High Benefit Potential",
    description:
      "Households with low opportunity scores but a large pool of unexplored eligible schemes — the highest-leverage segment.",
    signals: ["Opportunity score < 50", "Missed eligible schemes ≥ 3"],
    match: (_p, ctx) => ctx.opportunity < 50 && ctx.missed.length >= 3,
  },
  {
    key: "women-centric-need",
    name: "Women-Centric Need",
    description:
      "Women-led households eligible for women-focused welfare schemes that remain unexplored.",
    signals: ["Citizen gender = Female", "Eligible for ≥ 1 Women-category scheme"],
    match: (p, ctx) =>
      /female|woman/i.test(p.gender) && ctx.eligible.length > 0,
  },
  {
    key: "agricultural-vulnerability",
    name: "Agricultural Vulnerability",
    description:
      "Farming households with measurable missed welfare opportunities tied to agricultural support programmes.",
    signals: ["Occupation matches farmer/agriculture", "Missed eligible schemes ≥ 1"],
    match: (p, ctx) => /farm|agri|kisan/i.test(p.occupation) && ctx.missed.length >= 1,
  },
  {
    key: "senior-citizen-support",
    name: "Senior Citizen Support Need",
    description:
      "Citizens aged 60+ with unexplored eligible welfare schemes covering pension or healthcare support.",
    signals: ["Age ≥ 60", "Eligible schemes present"],
    match: (p, ctx) => p.age >= 60 && ctx.eligible.length > 0,
  },
  {
    key: "student-opportunity-cluster",
    name: "Student Opportunity Cluster",
    description:
      "Young citizens (age ≤ 25) or students with eligibility for education/scholarship schemes still unexplored.",
    signals: ["Age ≤ 25 OR occupation = Student", "Missed eligible schemes ≥ 1"],
    match: (p, ctx) =>
      (p.age <= 25 || /student/i.test(p.occupation)) && ctx.missed.length >= 1,
  },
];

export function buildArchetypes(input: ArchetypeInput): HouseholdArchetype[] {
  const { profiles, eligibleByProfile, exploredByProfile, schemeIndex, estimate } = input;
  const counts = new Map<ArchetypeKey, { households: number; benefits: number }>();
  for (const def of ARCHETYPES) counts.set(def.key, { households: 0, benefits: 0 });

  for (const p of profiles) {
    const eligible = eligibleByProfile.get(p.id) ?? [];
    const explored = exploredByProfile.get(p.id) ?? new Set<string>();
    const missed = eligible.filter((id) => !explored.has(id));
    const opportunity = eligible.length
      ? Math.round(((eligible.length - missed.length) / eligible.length) * 100)
      : 0;
    const ctx = { eligible, explored, missed, opportunity };

    // Benefit pool from missed schemes (deterministic per profile).
    let missedBenefits = 0;
    for (const id of missed) {
      const s = schemeIndex.get(id);
      if (s) missedBenefits += estimate(s);
    }

    for (const def of ARCHETYPES) {
      if (def.match(p, ctx)) {
        const c = counts.get(def.key)!;
        c.households += 1;
        c.benefits += missedBenefits;
      }
    }
  }

  return ARCHETYPES.map((def) => {
    const c = counts.get(def.key)!;
    return {
      key: def.key,
      name: def.name,
      description: def.description,
      households: c.households,
      potentialBenefitPoolINR: c.benefits,
      contributingSignals: def.signals,
    };
  });
}
