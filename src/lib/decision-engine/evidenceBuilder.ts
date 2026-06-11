import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import {
  evaluateAge,
  evaluateDisability,
  evaluateIncome,
  evaluateOccupation,
  evaluateState,
  type CriterionEvaluation,
} from "@/lib/eligibility";
import { computeConfidence } from "./confidenceEngine";
import type {
  DecisionOverview,
  DecisionReport,
  DecisionStatus,
  SchemeDecision,
} from "./types";

function evaluateAll(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation[] {
  return [
    evaluateState(profile, scheme),
    evaluateOccupation(profile, scheme),
    evaluateIncome(profile, scheme),
    evaluateAge(profile, scheme),
    evaluateDisability(profile, scheme),
  ];
}

function classify(evaluations: CriterionEvaluation[]): DecisionStatus {
  const stateEval = evaluations.find((e) => e.criterion === "state")!;
  const applicable = evaluations.filter((e) => e.applicable);
  const matched = applicable.filter((e) => e.matched);

  if (!stateEval.matched) return "not_eligible";
  // Need state + at least one other to call "eligible"
  const otherMatches = matched.filter((e) => e.criterion !== "state").length;
  if (otherMatches >= 2) return "eligible";
  if (otherMatches >= 1) return "eligible";
  // State matches but nothing else relevant aligned
  return applicable.length <= 1 ? "partial" : "partial";
}

export function buildSchemeDecision(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): SchemeDecision {
  const evaluations = evaluateAll(profile, scheme);
  const applicable = evaluations.filter((e) => e.applicable);
  const matched = applicable.filter((e) => e.matched);
  const unmet = applicable.filter((e) => !e.matched);
  const status = classify(evaluations);
  const hasEvidence = (scheme.eligibility_criteria ?? "").trim().length > 20;
  const confidence = computeConfidence(evaluations, profile, hasEvidence);

  return {
    scheme,
    status,
    matched,
    unmet,
    evidence: [...matched, ...unmet],
    confidence,
  };
}

export function buildOverview(decisions: SchemeDecision[]): DecisionOverview {
  const total = decisions.length;
  const eligible = decisions.filter((d) => d.status === "eligible").length;
  const partial = decisions.filter((d) => d.status === "partial").length;
  const notEligible = decisions.filter((d) => d.status === "not_eligible").length;
  const pct = (n: number) => (total === 0 ? 0 : Math.round((n / total) * 100));
  return {
    total,
    eligible,
    partial,
    notEligible,
    eligiblePct: pct(eligible),
    partialPct: pct(partial),
    notEligiblePct: pct(notEligible),
  };
}

export async function buildDecisionReport(
  profile: CitizenProfile,
): Promise<DecisionReport> {
  const [nationalSchemes, stateSchemes] = await Promise.all([
    listSchemes({ scope: "National" }),
    listSchemes({ state: profile.state }),
  ]);
  const byId = new Map<string, GovernmentScheme>();
  for (const s of [...nationalSchemes, ...stateSchemes]) byId.set(s.id, s);

  const decisions = Array.from(byId.values())
    .map((s) => buildSchemeDecision(profile, s))
    .sort((a, b) => b.confidence.score - a.confidence.score);

  return {
    profile,
    overview: buildOverview(decisions),
    decisions,
    generatedAt: new Date().toISOString(),
  };
}
