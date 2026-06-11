import { createServerFn } from "@tanstack/react-start";
import type { AgentSnapshot } from "./types";

export const getAgentSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<AgentSnapshot> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { computeOpportunityScore } = await import(
      "@/lib/welfare-gap/opportunityScorer"
    );
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );

    const [
      profilesRes,
      familyRes,
      assessmentsRes,
      guidesRes,
      navigatorRes,
      schemesRes,
    ] = await Promise.all([
      supabaseAdmin.from("citizen_profiles").select("id", { count: "exact", head: true }),
      supabaseAdmin
        .from("family_members")
        .select("citizen_profile_id")
        .order("id", { ascending: true }),
      supabaseAdmin
        .from("eligibility_assessments")
        .select("citizen_profile_id, recommended_scheme_ids")
        .order("id", { ascending: true }),
      supabaseAdmin
        .from("application_guide_usage")
        .select("id, scheme_id, citizen_profile_id", { count: "exact" })
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("goal_category, recommended_scheme_ids, citizen_profile_id", {
          count: "exact",
        })
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("government_schemes")
        .select("id, category, scheme_name, benefits"),
    ]);

    const totalCitizens = profilesRes.count ?? 0;
    const householdsManaged = new Set<string>();
    for (const f of familyRes.data ?? [])
      if (f.citizen_profile_id) householdsManaged.add(f.citizen_profile_id);

    const totalAssessments = assessmentsRes.data?.length ?? 0;
    const totalGuides = guidesRes.count ?? 0;
    const totalNavigatorPlans = navigatorRes.count ?? 0;

    const schemeIndex = new Map<
      string,
      { id: string; category: string; scheme_name: string; benefits: string | null }
    >();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    // Goals
    const goalCounts = new Map<string, number>();
    for (const r of navigatorRes.data ?? []) {
      const g = r.goal_category ?? "Other";
      goalCounts.set(g, (goalCounts.get(g) ?? 0) + 1);
    }

    // Recommended categories (from assessments)
    const categoryCounts = new Map<string, number>();
    const exploredByProfile = new Map<string, Set<string>>();
    for (const r of guidesRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      if (!exploredByProfile.has(r.citizen_profile_id))
        exploredByProfile.set(r.citizen_profile_id, new Set());
      exploredByProfile.get(r.citizen_profile_id)!.add(r.scheme_id);
    }
    for (const r of navigatorRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      if (!exploredByProfile.has(r.citizen_profile_id))
        exploredByProfile.set(r.citizen_profile_id, new Set());
      const set = exploredByProfile.get(r.citizen_profile_id)!;
      for (const id of r.recommended_scheme_ids ?? []) set.add(id);
    }

    const latestByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      latestByProfile.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
      for (const id of a.recommended_scheme_ids ?? []) {
        const s = schemeIndex.get(id);
        if (s)
          categoryCounts.set(s.category, (categoryCounts.get(s.category) ?? 0) + 1);
      }
    }

    const scores: number[] = [];
    let benefitSum = 0;
    let analyzed = 0;
    for (const [pid, eligible] of latestByProfile) {
      if (!eligible.length) continue;
      analyzed += 1;
      const explored = exploredByProfile.get(pid) ?? new Set<string>();
      const totalExplored = eligible.filter((id) => explored.has(id)).length;
      const { score } = computeOpportunityScore({
        totalEligible: eligible.length,
        totalExplored,
      });
      scores.push(score);
      for (const id of eligible) {
        if (explored.has(id)) continue;
        const s = schemeIndex.get(id);
        if (!s) continue;
        benefitSum += estimateAnnualValue({
          scheme_name: s.scheme_name,
          category: s.category,
          benefits: s.benefits,
        }).valueINR;
      }
    }

    return {
      overview: {
        totalCitizensAssisted: totalCitizens,
        totalHouseholdsManaged: householdsManaged.size,
        totalEligibilityAssessments: totalAssessments,
        totalGuidesGenerated: totalGuides,
        totalNavigatorPlans: totalNavigatorPlans,
      },
      analytics: {
        topGoals: [...goalCounts.entries()]
          .map(([goal, count]) => ({ goal, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        topRecommendedCategories: [...categoryCounts.entries()]
          .map(([category, count]) => ({ category, count }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 5),
        averageOpportunityScore:
          analyzed > 0
            ? Math.round(scores.reduce((a, b) => a + b, 0) / analyzed)
            : 0,
        averageAnnualBenefitINR:
          analyzed > 0 ? Math.round(benefitSum / analyzed) : 0,
      },
      generatedAt: new Date().toISOString(),
    };
  });
