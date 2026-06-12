import { createServerFn } from "@tanstack/react-start";
import type {
  PolicyIntelligenceSnapshot,
  CategoryCount,
  SchemeCount,
  GoalCount,
} from "./types";

export const getPolicyIntelligenceFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<PolicyIntelligenceSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { computeOpportunityScore } = await import(
      "@/lib/welfare-gap/opportunityScorer"
    );
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );
    const {
      topMissedCategories,
      buildUnderutilizedSchemes,
      buildUnderservedGroups,
    } = await import("./exclusionAnalyzer");
    const { buildStateRisk, buildStateDemand } = await import(
      "./regionalAnalytics"
    );
    const { generateRecommendations } = await import("./recommendationEngine");

    const [
      profilesRes,
      assessmentsRes,
      guidesRes,
      navRes,
      schemesRes,
      assistantRes,
      searchRes,
    ] = await Promise.all([
      supabaseAdmin
        .from("citizen_profiles")
        .select("id, age, gender, occupation, state"),
      supabaseAdmin
        .from("eligibility_assessments")
        .select("citizen_profile_id, recommended_scheme_ids")
        .order("id", { ascending: true }),
      supabaseAdmin
        .from("application_guide_usage")
        .select("citizen_profile_id, scheme_id"),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("citizen_profile_id, goal_category, recommended_scheme_ids"),
      supabaseAdmin
        .from("government_schemes")
        .select("id, scheme_name, category, benefits"),
      supabaseAdmin
        .from("assistant_queries")
        .select("retrieved_scheme_ids")
        .order("id", { ascending: true })
        .limit(2000),
      supabaseAdmin
        .from("scheme_search_logs")
        .select("search_query, state_selected")
        .order("id", { ascending: true })
        .limit(2000),
    ]);

    const schemeIndex = new Map<
      string,
      { id: string; scheme_name: string; category: string; benefits: string | null }
    >();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    const profileIndex = new Map<
      string,
      { id: string; age: number; gender: string; occupation: string; state: string }
    >();
    for (const p of profilesRes.data ?? []) profileIndex.set(p.id, p);

    // Explored sets per profile
    const exploredByProfile = new Map<string, Set<string>>();
    const ensureSet = (id: string) => {
      let s = exploredByProfile.get(id);
      if (!s) {
        s = new Set();
        exploredByProfile.set(id, s);
      }
      return s;
    };
    for (const r of guidesRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      ensureSet(r.citizen_profile_id).add(r.scheme_id);
    }
    for (const r of navRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      const s = ensureSet(r.citizen_profile_id);
      for (const id of r.recommended_scheme_ids ?? []) s.add(id);
    }

    // Latest assessment per profile (deterministic by ascending id → last wins).
    const latestByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      latestByProfile.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
    }

    // Aggregate household analytics
    const scores: number[] = [];
    let missedSum = 0;
    let benefitSum = 0;
    let analyzed = 0;
    let highRisk = 0;
    const missedSchemeIds: string[] = [];
    const eligibilityByScheme = new Map<string, number>();
    const exploredByScheme = new Map<string, number>();
    const scoresByState = new Map<string, number[]>();
    const perProfileForGroups: {
      profile: { id: string; age: number; gender: string; occupation: string };
      eligibleCount: number;
      missedCount: number;
      opportunityScore: number;
    }[] = [];

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
      if (score < 40) highRisk += 1;

      for (const id of eligible) {
        eligibilityByScheme.set(id, (eligibilityByScheme.get(id) ?? 0) + 1);
        if (explored.has(id)) {
          exploredByScheme.set(id, (exploredByScheme.get(id) ?? 0) + 1);
        } else {
          missedSchemeIds.push(id);
          const s = schemeIndex.get(id);
          if (s) {
            benefitSum += estimateAnnualValue({
              scheme_name: s.scheme_name,
              category: s.category,
              benefits: s.benefits,
            }).valueINR;
          }
        }
      }
      missedSum += eligible.length - totalExplored;

      const profile = profileIndex.get(profileId);
      if (profile) {
        perProfileForGroups.push({
          profile,
          eligibleCount: eligible.length,
          missedCount: eligible.length - totalExplored,
          opportunityScore: score,
        });
        const st = profile.state || "Unknown";
        if (!scoresByState.has(st)) scoresByState.set(st, []);
        scoresByState.get(st)!.push(score);
      }
    }

    // Trends
    const goalCounts = new Map<string, number>();
    const goalsByState = new Map<string, Map<string, number>>();
    const actionPlanCounts = new Map<string, number>();
    for (const r of navRes.data ?? []) {
      const g = r.goal_category ?? "Other";
      goalCounts.set(g, (goalCounts.get(g) ?? 0) + 1);
      const st = r.citizen_profile_id
        ? profileIndex.get(r.citizen_profile_id)?.state ?? null
        : null;
      if (st) {
        if (!goalsByState.has(st)) goalsByState.set(st, new Map());
        const m = goalsByState.get(st)!;
        m.set(g, (m.get(g) ?? 0) + 1);
      }
      for (const id of r.recommended_scheme_ids ?? [])
        actionPlanCounts.set(id, (actionPlanCounts.get(id) ?? 0) + 1);
    }

    const recommendedCats = new Map<string, number>();
    for (const r of assistantRes.data ?? []) {
      for (const id of r.retrieved_scheme_ids ?? []) {
        const s = schemeIndex.get(id);
        if (s) recommendedCats.set(s.category, (recommendedCats.get(s.category) ?? 0) + 1);
      }
    }

    const guideCounts = new Map<string, number>();
    for (const r of guidesRes.data ?? []) {
      guideCounts.set(r.scheme_id, (guideCounts.get(r.scheme_id) ?? 0) + 1);
    }

    // State demand via searched categories
    const categoriesByState = new Map<string, Map<string, number>>();
    const nameToCategory = new Map<string, string>();
    for (const s of schemesRes.data ?? [])
      if (s.scheme_name) nameToCategory.set(s.scheme_name.toLowerCase(), s.category);
    const CAT_HINTS: Record<string, string[]> = {
      Farmers: ["farmer", "agri", "kisan", "crop"],
      Women: ["women", "mahila", "girl"],
      Students: ["student", "scholarship", "education"],
      "Senior Citizens": ["senior", "pension", "elderly"],
      Entrepreneurs: ["entrepreneur", "msme", "mudra", "business"],
      "Health & Social Security": ["health", "ayushman", "insurance"],
    };
    for (const r of searchRes.data ?? []) {
      const st = r.state_selected || "Unknown";
      const q = (r.search_query ?? "").toLowerCase().trim();
      if (!q) continue;
      let cat: string | null = null;
      for (const [c, hints] of Object.entries(CAT_HINTS)) {
        if (q === c.toLowerCase() || hints.some((h) => q.includes(h))) {
          cat = c;
          break;
        }
      }
      if (!cat) {
        for (const [name, c] of nameToCategory) {
          if (name.includes(q) || q.includes(name)) {
            cat = c;
            break;
          }
        }
      }
      if (!cat) continue;
      if (!categoriesByState.has(st)) categoriesByState.set(st, new Map());
      const m = categoriesByState.get(st)!;
      m.set(cat, (m.get(cat) ?? 0) + 1);
    }

    const topMissed = topMissedCategories(missedSchemeIds, schemeIndex);
    const underutilized = buildUnderutilizedSchemes({
      eligibilityByScheme,
      exploredByScheme,
      schemeIndex,
    });
    const underserved = buildUnderservedGroups({ perProfile: perProfileForGroups });
    const stateRisk = buildStateRisk({ scoresByState });
    const stateDemand = buildStateDemand({ categoriesByState, goalsByState });

    const recommendations = generateRecommendations({
      topMissedCategories: topMissed,
      underservedGroups: underserved,
      underutilizedSchemes: underutilized,
      stateRisk,
      stateDemand,
    });

    const topN = <T extends { count: number }>(rows: T[], n = 5) =>
      [...rows].sort((a, b) => b.count - a.count).slice(0, n);

    const navigatorGoals: GoalCount[] = topN(
      [...goalCounts.entries()].map(([goal, count]) => ({ goal, count })),
    );
    const recommendedCategories: CategoryCount[] = topN(
      [...recommendedCats.entries()].map(([category, count]) => ({ category, count })),
    );
    const idCountsToSchemes = (m: Map<string, number>): SchemeCount[] =>
      topN(
        [...m.entries()].map(([id, count]) => ({
          id,
          name: schemeIndex.get(id)?.scheme_name ?? "Unknown scheme",
          count,
        })),
      );

    const risk = {
      high: scores.filter((s) => s < 40).length,
      moderate: scores.filter((s) => s >= 40 && s < 75).length,
      low: scores.filter((s) => s >= 75).length,
      total: scores.length,
    };

    return {
      overview: {
        householdsAnalyzed: analyzed,
        averageOpportunityScore:
          analyzed > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / analyzed) : 0,
        averageMissedOpportunities:
          analyzed > 0 ? Math.round(missedSum / analyzed) : 0,
        averageEstimatedAnnualBenefitsINR:
          analyzed > 0 ? Math.round(benefitSum / analyzed) : 0,
        highRiskPercentage: analyzed > 0 ? Math.round((highRisk / analyzed) * 100) : 0,
      },
      exclusion: {
        topMissedCategories: topMissed,
        underutilizedSchemes: underutilized,
        underservedGroups: underserved,
      },
      regional: {
        demand: stateDemand,
        risk: stateRisk,
      },
      trends: {
        navigatorGoals,
        recommendedCategories,
        topDownloadedReports: idCountsToSchemes(actionPlanCounts),
        topExploredGuides: idCountsToSchemes(guideCounts),
      },
      risk,
      recommendations,
      generatedAt: new Date().toISOString(),
      hasSufficientData: analyzed >= 1,
    };
  });
