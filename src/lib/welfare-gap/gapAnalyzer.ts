import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { recommendSchemes } from "@/lib/eligibility/recommendationEngine";
import type { GovernmentScheme } from "@/lib/schemes";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { familyMemberToProfileShape } from "@/lib/family-planner/familyExplanationGenerator";
import type { FamilyMember } from "@/lib/family-planner/types";
import { estimateAnnualValue } from "./benefitEstimator";
import { computeOpportunityScore } from "./opportunityScorer";
import { generateInsights } from "./insightsGenerator";
import type {
  MemberGap,
  MissedScheme,
  MissedSchemeReason,
  WelfareGapAnalysis,
} from "./types";

const inputSchema = z.object({
  citizen_profile_id: z.string().uuid().nullable(),
});

function emptyAnalysis(): WelfareGapAnalysis {
  return {
    hasData: false,
    members: [],
    household: { totalEligible: 0, totalExplored: 0, totalMissed: 0 },
    score: 0,
    tier: "High Risk of Welfare Exclusion",
    estimatedAnnualBenefitINR: 0,
    topMissedByValue: [],
    insights: [],
  };
}

export const getWelfareGapFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data))
  .handler(async ({ data }): Promise<WelfareGapAnalysis> => {
    if (!data.citizen_profile_id) return emptyAnalysis();
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    const [{ data: profile }, { data: family }, { data: schemes }] =
      await Promise.all([
        supabaseAdmin
          .from("citizen_profiles")
          .select("*")
          .eq("id", data.citizen_profile_id)
          .maybeSingle(),
        supabaseAdmin
          .from("family_members")
          .select("*")
          .eq("citizen_profile_id", data.citizen_profile_id)
          .order("created_at", { ascending: true }),
        supabaseAdmin.from("government_schemes").select("*"),
      ]);

    if (!profile) return emptyAnalysis();

    const headProfile = profile as unknown as CitizenProfile;
    const allSchemes = (schemes ?? []) as GovernmentScheme[];
    // Candidate schemes for this household = National + same-state.
    const candidates = allSchemes.filter(
      (s) => s.scheme_scope === "National" || s.state === headProfile.state,
    );

    // Explored schemes for this profile: from assistant retrievals + guide opens.
    const [{ data: queries }, { data: guideOpens }] = await Promise.all([
      supabaseAdmin
        .from("assistant_queries")
        .select("retrieved_scheme_ids")
        .eq("citizen_profile_id", data.citizen_profile_id),
      supabaseAdmin
        .from("application_guide_usage")
        .select("scheme_id")
        .eq("citizen_profile_id", data.citizen_profile_id),
    ]);

    const exploredIds = new Set<string>();
    for (const r of queries ?? [])
      for (const id of r.retrieved_scheme_ids ?? []) exploredIds.add(id);
    for (const r of guideOpens ?? []) if (r.scheme_id) exploredIds.add(r.scheme_id);

    const exploredCategories = new Set<string>();
    for (const s of allSchemes) if (exploredIds.has(s.id)) exploredCategories.add(s.category);

    // Per-member eligibility (head + dependents).
    const members: MemberGap[] = [];
    const householdEligibleIds = new Set<string>();
    const householdMissedById = new Map<string, MissedScheme>();
    const missedByCategory: Record<string, number> = {};

    function buildMemberGap(
      memberId: string,
      name: string,
      relationship: string,
      shaped: CitizenProfile,
    ) {
      const recs = recommendSchemes(shaped, candidates);
      const eligibleIds = recs.map((r) => r.scheme.id);
      for (const id of eligibleIds) householdEligibleIds.add(id);

      const explored = eligibleIds.filter((id) => exploredIds.has(id));
      const missedRecs = recs.filter((r) => !exploredIds.has(r.scheme.id));

      const missedSchemes: MissedScheme[] = missedRecs.map((r) => {
        const est = estimateAnnualValue(r.scheme);
        const reasons: MissedSchemeReason[] = ["eligible_not_explored", "demographic_match"];
        if (exploredCategories.has(r.scheme.category))
          reasons.push("related_category_viewed");
        const reasonText = explainReasons(reasons, r.scheme.category);
        const missed: MissedScheme = {
          schemeId: r.scheme.id,
          schemeName: r.scheme.scheme_name,
          category: r.scheme.category,
          scope: (r.scheme.scheme_scope as "National" | "State") ?? "State",
          annualValueINR: est.valueINR,
          reasons,
          reasonText,
        };
        if (!householdMissedById.has(missed.schemeId))
          householdMissedById.set(missed.schemeId, missed);
        return missed;
      });

      members.push({
        memberId,
        name,
        relationship,
        eligibleCount: eligibleIds.length,
        exploredCount: explored.length,
        missedCount: missedSchemes.length,
        missedSchemes: missedSchemes.slice(0, 6),
      });
    }

    buildMemberGap(headProfile.id, headProfile.full_name, "Head of Family", headProfile);

    const anchor = {
      id: headProfile.id,
      state: headProfile.state,
      district: headProfile.district,
      preferred_language: headProfile.preferred_language,
      family_members: headProfile.family_members,
      created_at: headProfile.created_at,
    };
    for (const m of (family ?? []) as FamilyMember[]) {
      const shaped = familyMemberToProfileShape(m, anchor) as CitizenProfile;
      buildMemberGap(m.id, m.full_name, m.relationship, shaped);
    }

    // Household aggregates (de-duplicated across members).
    const householdExplored = [...householdEligibleIds].filter((id) => exploredIds.has(id));
    const householdMissed = [...householdMissedById.values()];
    for (const m of householdMissed) {
      missedByCategory[m.category] = (missedByCategory[m.category] ?? 0) + 1;
    }

    const estimatedAnnualBenefitINR = householdMissed.reduce(
      (sum, m) => sum + m.annualValueINR,
      0,
    );
    const topMissedByValue = [...householdMissed]
      .sort((a, b) => b.annualValueINR - a.annualValueINR)
      .slice(0, 5);

    const { score, tier } = computeOpportunityScore({
      totalEligible: householdEligibleIds.size,
      totalExplored: householdExplored.length,
      familyMembersAssessed: family?.length ?? 0,
      hasEligibilityAssessment: householdEligibleIds.size > 0,
    });

    const insights = generateInsights({
      members,
      missedByCategory,
      totalMissed: householdMissed.length,
    });

    return {
      hasData: householdEligibleIds.size > 0,
      members,
      household: {
        totalEligible: householdEligibleIds.size,
        totalExplored: householdExplored.length,
        totalMissed: householdMissed.length,
      },
      score,
      tier,
      estimatedAnnualBenefitINR,
      topMissedByValue,
      insights,
    };
  });

function explainReasons(reasons: MissedSchemeReason[], category: string): string {
  const bits: string[] = [];
  if (reasons.includes("eligible_not_explored"))
    bits.push("Eligible based on profile but not yet explored");
  if (reasons.includes("demographic_match"))
    bits.push("Family member matches the demographic criteria");
  if (reasons.includes("related_category_viewed"))
    bits.push(`Related ${category} schemes were previously viewed`);
  return bits.join(" · ");
}
