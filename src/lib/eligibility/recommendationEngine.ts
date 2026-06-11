import { supabase } from "@/integrations/supabase/client";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import { getConfidence } from "./confidenceEvaluator";
import {
  evaluateAge,
  evaluateDisability,
  evaluateIncome,
  evaluateOccupation,
  evaluateState,
} from "./explanationGenerator";
import type {
  CriterionEvaluation,
  EligibilityAssessment,
  EligibilityRecommendation,
} from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

function evaluateScheme(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): EligibilityRecommendation | null {
  const evaluations: CriterionEvaluation[] = [
    evaluateState(profile, scheme),
    evaluateOccupation(profile, scheme),
    evaluateIncome(profile, scheme),
    evaluateAge(profile, scheme),
    evaluateDisability(profile, scheme),
  ];

  // Hard gating: state/national must match.
  const stateEval = evaluations.find((e) => e.criterion === "state")!;
  if (!stateEval.matched) return null;

  const matchedReasons = evaluations.filter((e) => e.matched);
  // Need at least state + one other signal to recommend.
  if (matchedReasons.length < 2) return null;

  const applicable = evaluations.filter((e) => e.applicable);

  return {
    scheme,
    matchedCount: matchedReasons.length,
    totalApplicable: Math.max(applicable.length, matchedReasons.length),
    confidence: getConfidence(matchedReasons.length),
    // Surface positives first, then optional context.
    reasons: [
      ...matchedReasons,
      ...evaluations.filter((e) => !e.matched && e.applicable),
    ],
  };
}

/**
 * Pure, reusable: given a profile and a list of schemes, return ranked
 * recommendations. Future modules (Family Welfare Planner, Voice Assistant,
 * Agentic CSC Assistant, Hybrid RAG) can call this with any scheme set.
 */
export function recommendSchemes(
  profile: CitizenProfile,
  schemes: GovernmentScheme[],
): EligibilityRecommendation[] {
  return schemes
    .map((s) => evaluateScheme(profile, s))
    .filter((r): r is EligibilityRecommendation => r !== null)
    .sort((a, b) => {
      if (b.matchedCount !== a.matchedCount) return b.matchedCount - a.matchedCount;
      return a.scheme.scheme_name.localeCompare(b.scheme.scheme_name);
    });
}

/**
 * Fetch all candidate schemes (national + the profile's state) and run the
 * eligibility engine against them.
 */
export async function assessProfileEligibility(
  profile: CitizenProfile,
): Promise<EligibilityAssessment> {
  const [nationalSchemes, stateSchemes] = await Promise.all([
    listSchemes({ scope: "National" }),
    listSchemes({ state: profile.state }),
  ]);

  // De-dupe in case of overlap.
  const byId = new Map<string, GovernmentScheme>();
  for (const s of [...nationalSchemes, ...stateSchemes]) byId.set(s.id, s);

  const recommendations = recommendSchemes(profile, Array.from(byId.values()));
  return {
    profile,
    recommendations,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Persist an assessment for future impact analytics. Errors are swallowed —
 * analytics must never break the user experience.
 */
export async function logEligibilityAssessment(
  profileId: string,
  recommendedSchemeIds: string[],
): Promise<void> {
  try {
    await db.from("eligibility_assessments").insert({
      citizen_profile_id: profileId,
      recommended_scheme_ids: recommendedSchemeIds,
    });
  } catch (err) {
    console.warn("Failed to log eligibility assessment", err);
  }
}
