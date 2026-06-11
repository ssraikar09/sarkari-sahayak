import { createServerFn } from "@tanstack/react-start";
import type {
  CategoryCount,
  GoalCount,
  HouseholdStats,
  InsightsSnapshot,
  RiskDistribution,
  SchemeCount,
  SchemeUtilization,
  WelfareTrends,
} from "./types";
import { bucketRisk } from "./riskDistribution";

const CATEGORY_HINTS = [
  "Farmer",
  "Women",
  "Student",
  "Senior",
  "Entrepreneur",
  "Health",
  "Education",
  "Housing",
];

function topN<T extends { count: number }>(rows: T[], n = 5): T[] {
  return [...rows].sort((a, b) => b.count - a.count).slice(0, n);
}

function bumpMap(map: Map<string, number>, key: string, by = 1): void {
  map.set(key, (map.get(key) ?? 0) + by);
}

export const getInsightsSnapshotFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<InsightsSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );
    const { computeOpportunityScore } = await import(
      "@/lib/welfare-gap/opportunityScorer"
    );

    // ---- Pull raw data in parallel ----
    const [
      searchRows,
      assistantRows,
      guideRows,
      navRows,
      assessmentRows,
      schemeRows,
    ] = await Promise.all([
      supabaseAdmin
        .from("scheme_search_logs")
        .select("search_query")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("assistant_queries")
        .select("retrieved_scheme_ids")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("application_guide_usage")
        .select("scheme_id")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("goal_category, recommended_scheme_ids")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("eligibility_assessments")
        .select("citizen_profile_id, recommended_scheme_ids")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("government_schemes")
        .select("id, scheme_name, category, benefits"),
    ]);

    const schemeIndex = new Map<
      string,
      { id: string; scheme_name: string; category: string; benefits: string | null }
    >();
    for (const s of schemeRows.data ?? []) schemeIndex.set(s.id, s);

    // ---- Welfare Trends ----
    const searchedCats = new Map<string, number>();
    for (const r of searchRows.data ?? []) {
      const q = (r.search_query ?? "").toLowerCase();
      for (const c of CATEGORY_HINTS) {
        if (q.includes(c.toLowerCase())) bumpMap(searchedCats, c);
      }
    }

    const recommendedCats = new Map<string, number>();
    const viewedSchemeCounts = new Map<string, number>();
    for (const r of assistantRows.data ?? []) {
      for (const id of r.retrieved_scheme_ids ?? []) {
        bumpMap(viewedSchemeCounts, id);
        const s = schemeIndex.get(id);
        if (s) bumpMap(recommendedCats, s.category || "Other");
      }
    }

    const guideCounts = new Map<string, number>();
    for (const r of guideRows.data ?? []) bumpMap(guideCounts, r.scheme_id);

    const goalCounts = new Map<string, number>();
    const actionPlanCounts = new Map<string, number>();
    for (const r of navRows.data ?? []) {
      bumpMap(goalCounts, r.goal_category ?? "Other");
      for (const id of r.recommended_scheme_ids ?? []) bumpMap(actionPlanCounts, id);
    }

    const trends: WelfareTrends = {
      searchedCategories: topN(
        [...searchedCats.entries()].map(([category, count]) => ({ category, count })),
      ),
      recommendedCategories: topN(
        [...recommendedCats.entries()].map(([category, count]) => ({ category, count })),
      ),
      topGuides: topN(idCountsToSchemes(guideCounts, schemeIndex)),
      navigatorGoals: topN(
        [...goalCounts.entries()].map(([goal, count]) => ({ goal, count })),
      ) as GoalCount[],
    };

    const utilization: SchemeUtilization = {
      topViewedSchemes: topN(idCountsToSchemes(viewedSchemeCounts, schemeIndex)),
      topDownloadedSummaries: topN(idCountsToSchemes(guideCounts, schemeIndex)),
      topActionPlanSchemes: topN(idCountsToSchemes(actionPlanCounts, schemeIndex)),
    };

    // ---- Household Statistics (per-profile aggregation) ----
    // Group exploration evidence per profile.
    const exploredByProfile = new Map<string, Set<string>>();
    // assistant_queries don't track profile id reliably across schema; use guides + navigator logs joined to assessments.
    // We approximate exploration as: schemes appearing in any application_guide_usage for the profile,
    // PLUS recommended_scheme_ids from navigator_usage_logs of the same profile.
    const [{ data: guideWithProfile }, { data: navWithProfile }] = await Promise.all([
      supabaseAdmin
        .from("application_guide_usage")
        .select("citizen_profile_id, scheme_id"),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("citizen_profile_id, recommended_scheme_ids"),
    ]);
    for (const r of guideWithProfile ?? []) {
      if (!r.citizen_profile_id) continue;
      if (!exploredByProfile.has(r.citizen_profile_id))
        exploredByProfile.set(r.citizen_profile_id, new Set());
      exploredByProfile.get(r.citizen_profile_id)!.add(r.scheme_id);
    }
    for (const r of navWithProfile ?? []) {
      if (!r.citizen_profile_id) continue;
      if (!exploredByProfile.has(r.citizen_profile_id))
        exploredByProfile.set(r.citizen_profile_id, new Set());
      const set = exploredByProfile.get(r.citizen_profile_id)!;
      for (const id of r.recommended_scheme_ids ?? []) set.add(id);
    }

    // Reduce to latest assessment per profile (deterministic by id sort already).
    const latestByProfile = new Map<string, string[]>();
    for (const a of assessmentRows.data ?? []) {
      latestByProfile.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
    }

    const scores: number[] = [];
    let missedSum = 0;
    let benefitSum = 0;
    let analyzed = 0;
    for (const [profileId, eligible] of latestByProfile) {
      if (!eligible.length) continue;
      analyzed += 1;
      const explored = exploredByProfile.get(profileId) ?? new Set<string>();
      const totalExplored = eligible.filter((id) => explored.has(id)).length;
      const { score } = computeOpportunityScore({
        totalEligible: eligible.length,
        totalExplored,
      });
      scores.push(score);
      const missedIds = eligible.filter((id) => !explored.has(id));
      missedSum += missedIds.length;
      for (const id of missedIds) {
        const s = schemeIndex.get(id);
        if (!s) continue;
        benefitSum += estimateAnnualValue({
          scheme_name: s.scheme_name,
          category: s.category,
          benefits: s.benefits,
        }).valueINR;
      }
    }

    const household: HouseholdStats = {
      profilesAnalyzed: analyzed,
      averageOpportunityScore:
        analyzed > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / analyzed) : 0,
      averageMissedOpportunities:
        analyzed > 0 ? Math.round(missedSum / analyzed) : 0,
      averageEstimatedAnnualBenefits:
        analyzed > 0 ? Math.round(benefitSum / analyzed) : 0,
    };

    const risk: RiskDistribution = bucketRisk(scores);

    return {
      trends,
      household,
      utilization,
      risk,
      generatedAt: new Date().toISOString(),
    };
  });

function idCountsToSchemes(
  counts: Map<string, number>,
  schemeIndex: Map<string, { id: string; scheme_name: string }>,
): SchemeCount[] {
  const out: SchemeCount[] = [];
  for (const [id, count] of counts) {
    const s = schemeIndex.get(id);
    out.push({ id, name: s?.scheme_name ?? "Unknown scheme", count });
  }
  return out;
}

// Re-export so route can import from a single module.
export type { CategoryCount } from "./types";
