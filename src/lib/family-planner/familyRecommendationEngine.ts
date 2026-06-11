import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import { recommendSchemes } from "@/lib/eligibility";
import { familyMemberToProfileShape } from "./familyExplanationGenerator";
import { listFamilyMembers } from "./familyService";
import type { FamilyAssessment, FamilyMemberRecommendations } from "./types";

/**
 * Reusable: assess every family member against the verified scheme catalogue
 * using the existing eligibility engine. Future modules (Voice Assistant,
 * Agentic CSC Assistant, Impact Dashboard) can call this directly.
 */
export async function assessFamilyEligibility(
  headOfFamily: CitizenProfile,
): Promise<FamilyAssessment> {
  const [members, nationalSchemes, stateSchemes] = await Promise.all([
    listFamilyMembers(headOfFamily.id),
    listSchemes({ scope: "National" }),
    listSchemes({ state: headOfFamily.state }),
  ]);

  const byId = new Map<string, GovernmentScheme>();
  for (const s of [...nationalSchemes, ...stateSchemes]) byId.set(s.id, s);
  const candidateSchemes = Array.from(byId.values());

  const anchor = {
    id: headOfFamily.id,
    state: headOfFamily.state,
    district: headOfFamily.district,
    preferred_language: headOfFamily.preferred_language,
    family_members: headOfFamily.family_members,
    created_at: headOfFamily.created_at,
  };

  const perMember: FamilyMemberRecommendations[] = members.map((m) => {
    const shaped = familyMemberToProfileShape(m, anchor) as CitizenProfile;
    return {
      member: m,
      recommendations: recommendSchemes(shaped, candidateSchemes),
    };
  });

  const categoryBreakdown: Record<string, number> = {};
  let totalRecommendations = 0;
  for (const m of perMember) {
    for (const r of m.recommendations) {
      totalRecommendations += 1;
      const cat = r.scheme.category;
      categoryBreakdown[cat] = (categoryBreakdown[cat] ?? 0) + 1;
    }
  }

  return {
    members: perMember,
    totalRecommendations,
    categoryBreakdown,
    generatedAt: new Date().toISOString(),
  };
}
