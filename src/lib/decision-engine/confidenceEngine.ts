import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { CriterionEvaluation } from "@/lib/eligibility";
import type { DecisionConfidence } from "./types";

/**
 * Score 0-100 derived from:
 *  - ratio of matched applicable criteria
 *  - profile completeness
 *  - presence of verified scheme evidence (eligibility_criteria text non-empty)
 *
 * Pure & deterministic — identical inputs produce identical scores.
 */
export function computeConfidence(
  evaluations: CriterionEvaluation[],
  profile: CitizenProfile,
  hasVerifiedEvidence: boolean,
): DecisionConfidence {
  const applicable = evaluations.filter((e) => e.applicable);
  const matched = applicable.filter((e) => e.matched);
  const ratio = applicable.length === 0 ? 0 : matched.length / applicable.length;

  const completeness = profileCompleteness(profile);
  const evidenceBonus = hasVerifiedEvidence ? 1 : 0.85;

  // 70% from match ratio, 20% from completeness, 10% from evidence presence.
  const raw = (ratio * 70 + completeness * 20 + evidenceBonus * 10);
  const score = Math.max(0, Math.min(100, Math.round(raw)));

  return { score, label: labelFor(score) };
}

export function profileCompleteness(profile: CitizenProfile): number {
  const fields = [
    profile.full_name,
    profile.state,
    profile.district,
    profile.occupation,
    profile.annual_income,
    profile.education_level,
    profile.preferred_language,
  ];
  const filled = fields.filter((f) => typeof f === "string" && f.trim().length > 0).length;
  const total = fields.length + 1; // +1 for age
  const ageFilled = profile.age > 0 ? 1 : 0;
  return (filled + ageFilled) / total;
}

function labelFor(score: number): DecisionConfidence["label"] {
  if (score >= 85) return "Strong Match";
  if (score >= 60) return "Moderate Match";
  if (score >= 30) return "Weak Match";
  return "No Match";
}

export function toneForScore(score: number): "success" | "warning" | "muted" | "destructive" {
  if (score >= 85) return "success";
  if (score >= 60) return "warning";
  if (score >= 30) return "muted";
  return "destructive";
}
