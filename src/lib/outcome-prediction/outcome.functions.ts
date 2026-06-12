import { createServerFn } from "@tanstack/react-start";
import type { OutcomePredictionSnapshot } from "./types";

export const getOutcomePredictionFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<OutcomePredictionSnapshot> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );
    const { generateForecast } = await import("./forecastGenerator");

    const [profilesRes, assessmentsRes, guidesRes, navRes, schemesRes] =
      await Promise.all([
        supabaseAdmin
          .from("citizen_profiles")
          .select("id, full_name, state"),
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

    const schemeIndex = new Map<
      string,
      { id: string; scheme_name: string; category: string; benefits: string | null }
    >();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    const benefitByScheme = new Map<string, number>();
    const categoryByScheme = new Map<string, string>();
    for (const s of schemesRes.data ?? []) {
      const v = estimateAnnualValue({
        scheme_name: s.scheme_name,
        category: s.category,
        benefits: s.benefits,
      });
      benefitByScheme.set(s.id, v.valueINR);
      categoryByScheme.set(s.id, s.category);
    }

    const profileIndex = new Map<
      string,
      { id: string; full_name: string; state: string }
    >();
    for (const p of profilesRes.data ?? []) profileIndex.set(p.id, p);

    // Latest assessment per profile — deterministic via ascending id (last wins)
    const eligibleByProfile = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      eligibleByProfile.set(
        a.citizen_profile_id,
        a.recommended_scheme_ids ?? [],
      );
    }

    // Explored set per profile (application guides + navigator-driven completions)
    const exploredByProfile = new Map<string, Set<string>>();
    const navRecommendedByProfile = new Map<string, Set<string>>();
    const ensureSet = (map: Map<string, Set<string>>, id: string) => {
      let s = map.get(id);
      if (!s) {
        s = new Set();
        map.set(id, s);
      }
      return s;
    };
    for (const r of guidesRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      ensureSet(exploredByProfile, r.citizen_profile_id).add(r.scheme_id);
    }
    for (const r of navRes.data ?? []) {
      if (!r.citizen_profile_id) continue;
      const rec = ensureSet(navRecommendedByProfile, r.citizen_profile_id);
      const explored = ensureSet(exploredByProfile, r.citizen_profile_id);
      for (const id of r.recommended_scheme_ids ?? []) {
        rec.add(id);
        explored.add(id);
      }
    }

    const households: Parameters<typeof generateForecast>[0]["households"] = [];
    for (const [profileId, eligible] of eligibleByProfile) {
      if (!eligible.length) continue;
      const profile = profileIndex.get(profileId);
      if (!profile) continue;
      households.push({
        profileId,
        fullName: profile.full_name,
        state: profile.state || "Unknown",
        eligible,
        exploredAlready: exploredByProfile.get(profileId) ?? new Set<string>(),
        navigatorRecommended:
          navRecommendedByProfile.get(profileId) ?? new Set<string>(),
      });
    }

    // Deterministic order — sort households by id so refreshes return the
    // same shape (no timestamps in the calculation path).
    households.sort((a, b) => a.profileId.localeCompare(b.profileId));

    return generateForecast({
      households,
      benefitByScheme,
      categoryByScheme,
      generatedAt: new Date().toISOString(),
    });
  });
