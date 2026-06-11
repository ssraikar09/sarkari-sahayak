import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import {
  listFamilyMembers,
  familyMemberToProfileShape,
  type FamilyMember,
} from "@/lib/family-planner";
import { buildSchemeDecision } from "@/lib/decision-engine/evidenceBuilder";
import type { SchemeDecision } from "@/lib/decision-engine/types";

import {
  applyLifeEvent,
  eventCategoryWeights,
  lifeStageFor,
} from "./lifeEventSimulator";
import {
  estimateAnnualBenefit,
  findMissed,
  forecastUpcoming,
  longTermBenefit,
} from "./opportunityForecaster";
import { bandFor, computeJourneyScore } from "./journeyScoring";
import type {
  LifeEventId,
  MemberFuturePlan,
  Roadmap,
  RoadmapYear,
} from "./types";

const ROADMAP_HORIZON = 5;

type YearPlan = {
  focus: string;
  categories: string[];
  outcome: string;
  rationale: (age: number, p: CitizenProfile) => string[];
};

function planForStage(age: number): YearPlan {
  if (age < 18)
    return {
      focus: "Education Support",
      categories: ["Education", "Scholarship"],
      outcome: "Continued schooling and scholarship access",
      rationale: () => ["Age progression places citizen in school-going years"],
    };
  if (age < 25)
    return {
      focus: "Higher Education & Skilling",
      categories: ["Education", "Scholarship", "Skill Development"],
      outcome: "Higher education completion & employability",
      rationale: () => ["Young adult life stage", "Skill-building unlocks employment schemes"],
    };
  if (age < 35)
    return {
      focus: "Entrepreneurship & Employment",
      categories: ["Entrepreneurship", "Employment", "Skill Development"],
      outcome: "Income growth and self-employment opportunities",
      rationale: (_a, p) => [
        "Working-age citizen",
        `Occupation profile: ${p.occupation}`,
      ],
    };
  if (age < 50)
    return {
      focus: "Health & Family Welfare",
      categories: ["Healthcare", "Women & Child", "Housing"],
      outcome: "Household stability and health protection",
      rationale: (_a, p) => [
        "Mid-career life stage",
        `Family of ${p.family_members} members benefits from household schemes`,
      ],
    };
  if (age < 60)
    return {
      focus: "Retirement Planning",
      categories: ["Pension", "Social Security", "Healthcare"],
      outcome: "Pension enrolment and pre-retirement security",
      rationale: () => ["Pre-retirement years require pension planning"],
    };
  return {
    focus: "Senior Welfare & Social Security",
    categories: ["Pension", "Healthcare", "Social Security"],
    outcome: "Elder care, pension and health protection",
    rationale: () => ["Senior citizen welfare benefits become primary"],
  };
}

function pickSchemesForPlan(
  plan: YearPlan,
  decisions: SchemeDecision[],
  eventWeights: Record<string, number>,
  used: Set<string>,
  limit = 3,
): GovernmentScheme[] {
  const ranked = [...decisions]
    .filter((d) => !used.has(d.scheme.id))
    .filter((d) => d.status !== "not_eligible")
    .map((d) => {
      let weight = d.confidence.score;
      if (plan.categories.includes(d.scheme.category)) weight += 40;
      const w = eventWeights[d.scheme.category];
      if (w) weight += w * 10;
      return { d, weight };
    })
    .sort((a, b) => b.weight - a.weight);

  const chosen: GovernmentScheme[] = [];
  for (const r of ranked) {
    if (chosen.length >= limit) break;
    chosen.push(r.d.scheme);
    used.add(r.d.scheme.id);
  }
  return chosen;
}

function buildYears(
  profile: CitizenProfile,
  decisions: SchemeDecision[],
  event: LifeEventId | null,
): RoadmapYear[] {
  const currentYear = new Date().getFullYear();
  const weights = eventCategoryWeights(event);
  const used = new Set<string>();
  const out: RoadmapYear[] = [];
  for (let i = 0; i < ROADMAP_HORIZON; i++) {
    const age = profile.age + i;
    const plan = planForStage(age);
    const schemes = pickSchemesForPlan(plan, decisions, weights, used, 3);
    out.push({
      year: currentYear + i,
      age,
      stage: lifeStageFor(age),
      focus: plan.focus,
      categories: plan.categories,
      schemes,
      expectedOutcome: plan.outcome,
      rationale: [
        ...plan.rationale(age, profile),
        `State: ${profile.state}`,
        event ? `Life event simulated: ${event.replace("_", " ")}` : "Based on current profile data",
      ],
    });
  }
  return out;
}

async function buildMemberPlan(
  member: FamilyMember | null,
  shaped: CitizenProfile,
  schemes: GovernmentScheme[],
): Promise<MemberFuturePlan> {
  const decisions = schemes
    .map((s) => buildSchemeDecision(shaped, s))
    .filter((d) => d.status !== "not_eligible")
    .sort((a, b) => b.confidence.score - a.confidence.score);

  const future = decisions.slice(0, 4).map((d) => d.scheme);
  const stage = lifeStageFor(shaped.age);

  const needs: string[] = [];
  if (shaped.age < 22) needs.push("Education & scholarship support");
  if (shaped.age >= 22 && shaped.age < 35) needs.push("Employment & skilling");
  if (shaped.age >= 35 && shaped.age < 60) needs.push("Healthcare & household welfare");
  if (shaped.age >= 60) needs.push("Pension & senior care");
  if (shaped.disability_status) needs.push("Disability assistance");

  return {
    member,
    displayName: member?.full_name ?? shaped.full_name,
    age: shaped.age,
    stage,
    predictedNeeds: needs,
    futureSchemes: future,
    estimatedAnnualBenefit: estimateAnnualBenefit(future),
  };
}

export async function generateRoadmap(
  rawProfile: CitizenProfile,
  event: LifeEventId | null = null,
): Promise<Roadmap> {
  const profile = applyLifeEvent(rawProfile, event);

  const [national, state, family] = await Promise.all([
    listSchemes({ scope: "National" }),
    listSchemes({ state: profile.state }),
    listFamilyMembers(rawProfile.id),
  ]);
  const byId = new Map<string, GovernmentScheme>();
  for (const s of [...national, ...state]) byId.set(s.id, s);
  const allSchemes = Array.from(byId.values());

  const decisions = allSchemes
    .map((s) => buildSchemeDecision(profile, s))
    .sort((a, b) => b.confidence.score - a.confidence.score);

  const years = buildYears(profile, decisions, event);

  const anchor = {
    id: rawProfile.id,
    state: rawProfile.state,
    district: rawProfile.district,
    preferred_language: rawProfile.preferred_language,
    family_members: rawProfile.family_members,
    created_at: rawProfile.created_at,
  };

  const anchorPlan = await buildMemberPlan(null, profile, allSchemes);
  const memberPlans = await Promise.all(
    family.map((m) =>
      buildMemberPlan(
        m,
        familyMemberToProfileShape(m, anchor) as CitizenProfile,
        allSchemes,
      ),
    ),
  );

  const journeyScore = computeJourneyScore(profile, decisions, family.length);

  return {
    profile,
    years,
    household: [anchorPlan, ...memberPlans],
    upcoming: forecastUpcoming(years),
    missed: findMissed(decisions),
    longTermBenefit: longTermBenefit(years),
    journeyScore,
    journeyBand: bandFor(journeyScore),
    appliedEvent: event,
    generatedAt: new Date().toISOString(),
  };
}
