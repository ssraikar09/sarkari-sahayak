import { createServerFn } from "@tanstack/react-start";
import type { DigitalTwinBaseline, DigitalTwinHousehold } from "./types";

/**
 * Build the deterministic baseline used by the Digital Twin from existing
 * analytics tables — reuses the same data shape as Module 17.
 */
export const getDigitalTwinBaselineFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<DigitalTwinBaseline> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );

    const [profilesRes, assessmentsRes, guidesRes, navRes, schemesRes] =
      await Promise.all([
        supabaseAdmin.from("citizen_profiles").select("id, full_name, state"),
        supabaseAdmin
          .from("eligibility_assessments")
          .select("citizen_profile_id, recommended_scheme_ids")
          .order("id", { ascending: true }),
        supabaseAdmin
          .from("application_guide_usage")
          .select("citizen_profile_id, scheme_id"),
        supabaseAdmin
          .from("navigator_usage_logs")
          .select("citizen_profile_id, recommended_scheme_ids"),
        supabaseAdmin
          .from("government_schemes")
          .select("id, scheme_name, category, benefits"),
      ]);

    const benefitByScheme = new Map<string, number>();
    for (const s of schemesRes.data ?? []) {
      const v = estimateAnnualValue({
        scheme_name: s.scheme_name,
        category: s.category,
        benefits: s.benefits,
      });
      benefitByScheme.set(s.id, v.valueINR);
    }

    const profileIndex = new Map<
      string,
      { id: string; full_name: string; state: string }
    >();
    for (const p of profilesRes.data ?? []) profileIndex.set(p.id, p);

    const eligibleByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      eligibleByProfile.set(
        a.citizen_profile_id,
        a.recommended_scheme_ids ?? [],
      );
    }

    const exploredByProfile = new Map<string, Set<string>>();
    const navByProfile = new Map<string, Set<string>>();
    const ensure = (m: Map<string, Set<string>>, k: string) => {
      let s = m.get(k);
      if (!s) {
        s = new Set();
        m.set(k, s);
      }
      return s;
    };
    for (const r of guidesRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      ensure(exploredByProfile, r.citizen_profile_id).add(r.scheme_id);
    }
    for (const r of navRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      const nav = ensure(navByProfile, r.citizen_profile_id);
      const explored = ensure(exploredByProfile, r.citizen_profile_id);
      for (const id of r.recommended_scheme_ids ?? []) {
        nav.add(id);
        explored.add(id);
      }
    }

    const households: DigitalTwinHousehold[] = [];
    let scoreSum = 0;
    let missedSum = 0;
    let benefitSum = 0;
    let highRisk = 0;
    let navWithUse = 0;
    let exploredSum = 0;
    let eligibleSum = 0;

    for (const [profileId, eligible] of eligibleByProfile) {
      if (!eligible.length) continue;
      const profile = profileIndex.get(profileId);
      if (!profile) continue;

      const exploredSet = exploredByProfile.get(profileId) ?? new Set<string>();
      const navSet = navByProfile.get(profileId) ?? new Set<string>();

      const exploredHere = eligible.filter((id) => exploredSet.has(id));
      const missed = eligible.filter((id) => !exploredSet.has(id));
      const navEligible = eligible.filter((id) => navSet.has(id)).length;

      const exploredBenefits = exploredHere.reduce(
        (a, id) => a + (benefitByScheme.get(id) ?? 0),
        0,
      );
      const totalEligibleBenefits = eligible.reduce(
        (a, id) => a + (benefitByScheme.get(id) ?? 0),
        0,
      );
      const rankedMissedBenefits = missed
        .map((id) => benefitByScheme.get(id) ?? 0)
        .sort((a, b) => b - a);

      const score = Math.round((exploredHere.length / eligible.length) * 100);
      scoreSum += score;
      missedSum += missed.length;
      benefitSum += exploredBenefits;
      if (score < 40) highRisk += 1;
      if (navEligible > 0) navWithUse += 1;
      exploredSum += exploredHere.length;
      eligibleSum += eligible.length;

      households.push({
        profileId,
        fullName: profile.full_name,
        state: profile.state || "Unknown",
        eligible: eligible.length,
        explored: exploredHere.length,
        navigatorEligible: navEligible,
        rankedMissedBenefits,
        exploredBenefitsINR: exploredBenefits,
        totalEligibleBenefitsINR: totalEligibleBenefits,
      });
    }

    households.sort((a, b) => a.profileId.localeCompare(b.profileId));

    const n = households.length;
    const avgScore = n ? Math.round(scoreSum / n) : 0;
    const highRiskPct = n ? Math.round((highRisk / n) * 100) : 0;
    const readiness = Math.round(0.6 * avgScore + 0.4 * (100 - highRiskPct));

    return {
      households,
      generatedAt: new Date().toISOString(),
      totals: {
        households: n,
        averageOpportunityScore: avgScore,
        averageMissedOpportunities: n
          ? Math.round((missedSum / n) * 10) / 10
          : 0,
        averageAnnualBenefitsINR: n ? Math.round(benefitSum / n) : 0,
        highRiskPct,
        welfareReadinessScore: readiness,
        navigatorAdoptionPct: n ? Math.round((navWithUse / n) * 100) : 0,
        csCoverageProxyPct:
          eligibleSum > 0
            ? Math.round((exploredSum / eligibleSum) * 100)
            : 0,
      },
      hasSufficientData: n > 0,
    };
  });
