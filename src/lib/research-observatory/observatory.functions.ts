import { createServerFn } from "@tanstack/react-start";
import type {
  CategoryMetric,
  ConcentrationRow,
  ResearchSnapshot,
  ResearchSnapshotMetrics,
  TrendObservatory,
} from "./types";
import { buildArchetypes, type ProfileRecord, type SchemeRecord } from "./archetypeEngine";
import { generateFindings } from "./findingsGenerator";

export const getResearchObservatoryFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<ResearchSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );

    const [profilesRes, schemesRes, assessmentsRes, guidesRes, navRes] =
      await Promise.all([
        supabaseAdmin
          .from("citizen_profiles")
          .select("id, age, gender, occupation, education_level, disability_status"),
        supabaseAdmin
          .from("government_schemes")
          .select("id, scheme_name, category, benefits"),
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
      ]);

    const profiles: ProfileRecord[] = (profilesRes.data ?? []).map((p) => ({
      id: p.id,
      age: p.age,
      gender: p.gender,
      occupation: p.occupation,
      education_level: p.education_level,
      disability_status: !!p.disability_status,
    }));

    const schemeIndex = new Map<string, SchemeRecord>();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    const eligibleByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      eligibleByProfile.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
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
      const set = ensure(r.citizen_profile_id);
      for (const id of r.recommended_scheme_ids ?? []) set.add(id);
    }

    // Goal categories covered.
    const goalCategorySet = new Set<string>();
    for (const r of navRes.data ?? []) {
      if (r.goal_category) goalCategorySet.add(r.goal_category);
    }

    // Per-household calculations.
    let analysed = 0;
    let scoreSum = 0;
    let benefitSum = 0;
    let highRisk = 0;
    const missedByCategoryCount = new Map<string, number>();
    let totalMissed = 0;
    const benefitByCategory = new Map<string, number>();
    const eligibleByCategoryCount = new Map<string, number>();
    const exploredByCategoryCount = new Map<string, number>();
    const riskBuckets = { high: 0, moderate: 0, low: 0 };

    const estimate = (s: SchemeRecord) =>
      estimateAnnualValue({
        scheme_name: s.scheme_name,
        category: s.category,
        benefits: s.benefits,
      }).valueINR;

    for (const [pid, eligible] of eligibleByProfile) {
      if (!eligible.length) continue;
      analysed += 1;
      const explored = exploredByProfile.get(pid) ?? new Set<string>();
      const exploredCount = eligible.filter((id) => explored.has(id)).length;
      const score = Math.round((exploredCount / eligible.length) * 100);
      scoreSum += score;
      if (score < 40) {
        highRisk += 1;
        riskBuckets.high += 1;
      } else if (score < 70) riskBuckets.moderate += 1;
      else riskBuckets.low += 1;

      for (const id of eligible) {
        const s = schemeIndex.get(id);
        if (!s) continue;
        const cat = s.category || "Other";
        eligibleByCategoryCount.set(cat, (eligibleByCategoryCount.get(cat) ?? 0) + 1);
        if (explored.has(id)) {
          exploredByCategoryCount.set(cat, (exploredByCategoryCount.get(cat) ?? 0) + 1);
        } else {
          totalMissed += 1;
          missedByCategoryCount.set(cat, (missedByCategoryCount.get(cat) ?? 0) + 1);
          const v = estimate(s);
          benefitSum += v;
          benefitByCategory.set(cat, (benefitByCategory.get(cat) ?? 0) + v);
        }
      }
    }

    const metrics: ResearchSnapshotMetrics = {
      householdsStudied: analysed,
      schemesAnalyzed: schemeIndex.size,
      goalCategoriesCovered: goalCategorySet.size,
      highRiskSharePercent: analysed ? Math.round((highRisk / analysed) * 100) : 0,
      averageOpportunityScore: analysed ? Math.round(scoreSum / analysed) : 0,
      averageProjectedBenefitINR: analysed ? Math.round(benefitSum / analysed) : 0,
    };

    const missedByCategory: CategoryMetric[] = [...missedByCategoryCount.entries()]
      .map(([category, count]) => ({
        category,
        count,
        percent: totalMissed ? Math.round((count / totalMissed) * 100) : 0,
      }))
      .sort((a, b) => b.count - a.count || a.category.localeCompare(b.category))
      .slice(0, 8);

    const utilizationGaps = [...eligibleByCategoryCount.entries()]
      .map(([category, eligible]) => {
        const explored = exploredByCategoryCount.get(category) ?? 0;
        const gapPercent = eligible ? Math.round(((eligible - explored) / eligible) * 100) : 0;
        return { category, eligible, explored, gapPercent };
      })
      .sort((a, b) => b.gapPercent - a.gapPercent || b.eligible - a.eligible)
      .slice(0, 8);

    const totalBenefitMissed = [...benefitByCategory.values()].reduce(
      (a, b) => a + b,
      0,
    );
    const benefitConcentration: ConcentrationRow[] = [...benefitByCategory.entries()]
      .map(([label, value]) => ({
        label,
        value,
        share: totalBenefitMissed ? value / totalBenefitMissed : 0,
      }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);

    const totalRisk = riskBuckets.high + riskBuckets.moderate + riskBuckets.low;
    const riskConcentration: ConcentrationRow[] = (
      [
        { label: "High Risk", value: riskBuckets.high },
        { label: "Moderate Risk", value: riskBuckets.moderate },
        { label: "Low Risk", value: riskBuckets.low },
      ] as { label: string; value: number }[]
    ).map((r) => ({
      ...r,
      share: totalRisk ? r.value / totalRisk : 0,
    }));

    // Navigator adoption trend
    const navHouseholds = new Set<string>();
    const navGoalCounts = new Map<string, number>();
    for (const r of navRes.data ?? []) {
      if (r.citizen_profile_id) navHouseholds.add(r.citizen_profile_id);
      const goal = r.goal_category ?? "Other";
      navGoalCounts.set(goal, (navGoalCounts.get(goal) ?? 0) + 1);
    }
    const navTotalInteractions = (navRes.data ?? []).length;
    const navAdoptionPercent = analysed
      ? Math.round((navHouseholds.size / analysed) * 100)
      : 0;
    const topGoals = [...navGoalCounts.entries()]
      .map(([goal, count]) => ({ goal, count }))
      .sort((a, b) => b.count - a.count || a.goal.localeCompare(b.goal))
      .slice(0, 5);

    const trends: TrendObservatory = {
      missedByCategory,
      utilizationGaps,
      benefitConcentration,
      riskConcentration,
      navigatorAdoption: {
        totalInteractions: navTotalInteractions,
        householdsEngaged: navHouseholds.size,
        adoptionPercent: navAdoptionPercent,
        topGoals,
      },
    };

    const archetypes = buildArchetypes({
      profiles,
      eligibleByProfile,
      exploredByProfile,
      schemeIndex,
      estimate,
    });

    const findings = generateFindings({ metrics, trends, archetypes });

    return {
      metrics,
      trends,
      archetypes,
      findings,
      generatedAt: new Date().toISOString(),
      hasSufficientData: analysed > 0,
    };
  });
