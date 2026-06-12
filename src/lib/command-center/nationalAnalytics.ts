import { createServerFn } from "@tanstack/react-start";
import type { NationalSnapshot, StateLeaderboardRow, WelfareGoalProgress, UnderperformingScheme, WelfareGoalCategory } from "./types";

/**
 * National analytics aggregator for the Welfare Command Center.
 *
 * Reuses the Policy Intelligence snapshot (already aggregates eligibility,
 * navigator, guide, assistant and search analytics) and augments it with
 * national-readiness, leaderboard, alerts, interventions, goal tracking
 * and underperforming scheme rollups.
 *
 * All calculations are deterministic. No random sampling, no time-dependent
 * inputs aside from the snapshot's own generatedAt timestamp (which is
 * passed through unchanged).
 */
export const getCommandCenterFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<NationalSnapshot> => {
    const { getPolicyIntelligenceFn } = await import(
      "@/lib/policy-intelligence/insightEngine.functions"
    );
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );
    const { buildAlerts } = await import("./alertEngine");
    const { buildInterventions } = await import("./interventionEngine");

    const snap = await getPolicyIntelligenceFn();

    // Extra reads required to compute totals and goal tracker.
    const [schemesRes, assessmentsRes, guidesRes, navRes, profilesRes] = await Promise.all([
      supabaseAdmin.from("government_schemes").select("id, scheme_name, category, benefits"),
      supabaseAdmin
        .from("eligibility_assessments")
        .select("citizen_profile_id, recommended_scheme_ids")
        .order("id", { ascending: true }),
      supabaseAdmin.from("application_guide_usage").select("citizen_profile_id, scheme_id"),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("citizen_profile_id, goal_category, recommended_scheme_ids"),
      supabaseAdmin.from("citizen_profiles").select("id, state"),
    ]);

    const schemeIndex = new Map<
      string,
      { id: string; scheme_name: string; category: string; benefits: string | null }
    >();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    const stateByProfile = new Map<string, string>();
    for (const p of profilesRes.data ?? []) stateByProfile.set(p.id, p.state || "Unknown");

    const latestByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      latestByProfile.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
    }

    const exploredByProfile = new Map<string, Set<string>>();
    const ensure = (id: string) => {
      let s = exploredByProfile.get(id);
      if (!s) {
        s = new Set();
        exploredByProfile.set(id, s);
      }
      return s;
    };
    for (const r of guidesRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      ensure(r.citizen_profile_id).add(r.scheme_id);
    }
    for (const r of navRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      const s = ensure(r.citizen_profile_id);
      for (const id of r.recommended_scheme_ids ?? []) s.add(id);
    }

    // National totals
    const totalEligibleSchemes = [...latestByProfile.values()].reduce(
      (sum, ids) => sum + ids.length,
      0,
    );

    let totalBenefitsUnlocked = 0;
    const stateAgg = new Map<
      string,
      {
        households: number;
        scoreSum: number;
        high: number;
        benefits: number;
      }
    >();

    for (const [profileId, eligible] of latestByProfile) {
      if (!eligible.length) continue;
      const explored = exploredByProfile.get(profileId) ?? new Set<string>();
      const exploredCount = eligible.filter((id) => explored.has(id)).length;
      const score = Math.round((exploredCount / eligible.length) * 100);
      let benefits = 0;
      for (const id of eligible) {
        if (!explored.has(id)) continue;
        const s = schemeIndex.get(id);
        if (s) {
          benefits += estimateAnnualValue({
            scheme_name: s.scheme_name,
            category: s.category,
            benefits: s.benefits,
          }).valueINR;
        }
      }
      totalBenefitsUnlocked += benefits;

      const st = stateByProfile.get(profileId) ?? "Unknown";
      const a = stateAgg.get(st) ?? { households: 0, scoreSum: 0, high: 0, benefits: 0 };
      a.households += 1;
      a.scoreSum += score;
      if (score < 40) a.high += 1;
      a.benefits += benefits;
      stateAgg.set(st, a);
    }

    const welfareReadinessScore = Math.round(
      snap.overview.averageOpportunityScore * 0.6 +
        (100 - snap.overview.highRiskPercentage) * 0.4,
    );

    // Leaderboard
    const leaderboard: StateLeaderboardRow[] = [...stateAgg.entries()]
      .map(([state, a]) => {
        const opp = a.households ? Math.round(a.scoreSum / a.households) : 0;
        const highPct = a.households ? Math.round((a.high / a.households) * 100) : 0;
        const readiness = Math.round(opp * 0.6 + (100 - highPct) * 0.4);
        return {
          state,
          households: a.households,
          opportunityScore: opp,
          highRiskPercentage: highPct,
          estimatedBenefitsUnlockedINR: a.benefits,
          welfareReadinessScore: readiness,
        };
      })
      .sort((a, b) => b.welfareReadinessScore - a.welfareReadinessScore || a.state.localeCompare(b.state));

    // Underperforming schemes (top opportunity gaps)
    const underperformingSchemes: UnderperformingScheme[] = snap.exclusion.underutilizedSchemes
      .map((s) => ({
        id: s.id,
        name: s.name,
        category: s.category,
        eligibleHouseholds: s.eligibleCount,
        utilizationPercent: Math.round(s.utilizationRate * 100),
        opportunityGap: Math.max(0, s.eligibleCount - s.exploredCount),
      }))
      .sort((a, b) => b.opportunityGap - a.opportunityGap || a.name.localeCompare(b.name))
      .slice(0, 10);

    // Goal tracker
    const navTotal = (navRes.data ?? []).length;
    const navByGoal = new Map<string, number>();
    for (const r of navRes.data ?? []) {
      navByGoal.set(r.goal_category ?? "Other", (navByGoal.get(r.goal_category ?? "Other") ?? 0) + 1);
    }
    const GOAL_CATEGORIES: Record<
      WelfareGoalCategory,
      { schemeCats: string[]; goalKeys: string[] }
    > = {
      Education: {
        schemeCats: ["Student", "Students", "Education"],
        goalKeys: ["education", "scholarship", "study"],
      },
      Healthcare: {
        schemeCats: ["Health & Social Security", "Healthcare", "Health"],
        goalKeys: ["health", "medical", "hospital"],
      },
      "Women's Empowerment": {
        schemeCats: ["Women"],
        goalKeys: ["women", "mahila", "girl"],
      },
      Entrepreneurship: {
        schemeCats: ["Entrepreneurs", "MSME", "Business"],
        goalKeys: ["business", "entrepreneur", "loan", "mudra"],
      },
      "Senior Citizen Welfare": {
        schemeCats: ["Senior Citizens", "Pension"],
        goalKeys: ["senior", "pension", "elderly"],
      },
    };

    // Build eligibility/explored counts per scheme for goal aggregation
    const eligByScheme = new Map<string, number>();
    const expByScheme = new Map<string, number>();
    for (const [profileId, eligible] of latestByProfile) {
      const explored = exploredByProfile.get(profileId) ?? new Set<string>();
      for (const id of eligible) {
        eligByScheme.set(id, (eligByScheme.get(id) ?? 0) + 1);
        if (explored.has(id)) expByScheme.set(id, (expByScheme.get(id) ?? 0) + 1);
      }
    }

    const goals: WelfareGoalProgress[] = (
      Object.keys(GOAL_CATEGORIES) as WelfareGoalCategory[]
    ).map((goal) => {
      const cfg = GOAL_CATEGORIES[goal];
      let eligibleSchemes = 0;
      let exploredOccurrences = 0;
      for (const [id, sch] of schemeIndex) {
        if (!cfg.schemeCats.includes(sch.category)) continue;
        eligibleSchemes += eligByScheme.get(id) ?? 0;
        exploredOccurrences += expByScheme.get(id) ?? 0;
      }
      const utilizationPercent = eligibleSchemes
        ? Math.round((exploredOccurrences / eligibleSchemes) * 100)
        : 0;
      let navigatorDemand = 0;
      for (const [g, n] of navByGoal) {
        const gl = g.toLowerCase();
        if (cfg.goalKeys.some((k) => gl.includes(k))) navigatorDemand += n;
      }
      return { goal, eligibleSchemes, exploredOccurrences, utilizationPercent, navigatorDemand };
    });

    const alerts = buildAlerts({
      stateRisk: snap.regional.risk,
      underutilized: snap.exclusion.underutilizedSchemes,
      topMissedCategories: snap.exclusion.topMissedCategories,
      navigatorTotal: navTotal,
      householdsAnalyzed: snap.overview.householdsAnalyzed,
    });

    const interventions = buildInterventions({
      alerts,
      navigatorTotal: navTotal,
      householdsAnalyzed: snap.overview.householdsAnalyzed,
      averageOpportunityScore: snap.overview.averageOpportunityScore,
    });

    return {
      overview: {
        ...snap.overview,
        totalEligibleSchemes,
        totalEstimatedBenefitsUnlockedINR: totalBenefitsUnlocked,
        welfareReadinessScore,
      },
      leaderboard,
      alerts,
      interventions,
      trends: snap.trends,
      underperformingSchemes,
      goals,
      risk: snap.risk,
      regional: snap.regional,
      upstreamRecommendations: snap.recommendations,
      underutilizedSchemes: snap.exclusion.underutilizedSchemes,
      generatedAt: snap.generatedAt,
      hasSufficientData: snap.hasSufficientData,
    };
  });
