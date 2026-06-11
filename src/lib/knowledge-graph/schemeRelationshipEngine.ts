import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type { FamilyMember } from "@/lib/family-planner";
import { familyMemberToProfileShape } from "@/lib/family-planner";
import { buildSchemeDecision } from "@/lib/decision-engine/evidenceBuilder";
import { goalsForCategory } from "./navigatorConnector";
import type { SchemeRelationship } from "./types";

/**
 * For every scheme, determine: which household members are eligible, what
 * the average decision-engine confidence is, evidence count (matched
 * criteria), and which navigator goal categories the scheme supports.
 */
export function buildSchemeRelationships(
  citizen: CitizenProfile,
  family: FamilyMember[],
  schemes: GovernmentScheme[],
): SchemeRelationship[] {
  const anchor = {
    id: citizen.id,
    state: citizen.state,
    district: citizen.district,
    preferred_language: citizen.preferred_language,
    family_members: citizen.family_members,
    created_at: citizen.created_at,
  };
  const profiles: { memberId: string; profile: CitizenProfile }[] = [
    { memberId: citizen.id, profile: citizen },
    ...family.map((m) => ({
      memberId: m.id,
      profile: familyMemberToProfileShape(m, anchor) as CitizenProfile,
    })),
  ];

  const out: SchemeRelationship[] = [];
  for (const scheme of schemes) {
    const decisions = profiles.map((p) => ({
      memberId: p.memberId,
      decision: buildSchemeDecision(p.profile, scheme),
    }));
    const related = decisions.filter((d) => d.decision.status === "eligible");
    if (related.length === 0) continue;

    const avgConfidence = Math.round(
      related.reduce((s, r) => s + r.decision.confidence.score, 0) /
        related.length,
    );
    const evidenceCount = Math.round(
      related.reduce((s, r) => s + r.decision.matched.length, 0) /
        related.length,
    );

    out.push({
      schemeId: scheme.id,
      schemeName: scheme.scheme_name,
      category: scheme.category,
      scope: scheme.scheme_scope,
      relatedMemberIds: related.map((r) => r.memberId),
      confidence: avgConfidence,
      evidenceCount,
      goalCategories: goalsForCategory(scheme.category),
    });
  }

  return out.sort((a, b) => b.confidence - a.confidence);
}
