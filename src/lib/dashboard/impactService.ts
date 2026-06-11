import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  CategoryKey,
  HouseholdImpact,
  PersonalImpact,
} from "./dashboardTypes";

/**
 * Map a scheme's verbose category label to the dashboard's canonical key.
 * Keeps unknown categories visible under "Other" instead of dropping them.
 */
function canonicalCategory(raw: string | null | undefined): CategoryKey {
  const v = (raw ?? "").toLowerCase();
  if (v.includes("farmer")) return "Farmer";
  if (v.includes("women")) return "Women";
  if (v.includes("student")) return "Student";
  if (v.includes("senior")) return "Senior Citizen";
  if (v.includes("entrepreneur") || v.includes("business") || v.includes("mudra"))
    return "Entrepreneur";
  if (v.includes("health") || v.includes("social")) return "Health & Social Security";
  return "Other";
}

function emptyByCategory(): Record<CategoryKey, number> {
  return {
    Farmer: 0,
    Women: 0,
    Student: 0,
    "Senior Citizen": 0,
    Entrepreneur: 0,
    "Health & Social Security": 0,
    Other: 0,
  };
}

const profileSchema = z.object({ citizen_profile_id: z.string().uuid().nullable() });

export const getPersonalImpactFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data }): Promise<PersonalImpact> => {
    const empty: PersonalImpact = {
      totalEligible: 0,
      national: 0,
      state: 0,
      family: 0,
      byCategory: emptyByCategory(),
      hasProfile: false,
      hasAssessment: false,
    };
    if (!data.citizen_profile_id) return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: profile } = await supabaseAdmin
      .from("citizen_profiles")
      .select("id")
      .eq("id", data.citizen_profile_id)
      .maybeSingle();

    const { data: assessment } = await supabaseAdmin
      .from("eligibility_assessments")
      .select("recommended_scheme_ids, created_at")
      .eq("citizen_profile_id", data.citizen_profile_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const schemeIds: string[] = assessment?.recommended_scheme_ids ?? [];
    let schemes: { scheme_scope: string; category: string }[] = [];
    if (schemeIds.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from("government_schemes")
        .select("scheme_scope, category")
        .in("id", schemeIds);
      schemes = rows ?? [];
    }

    const byCategory = emptyByCategory();
    let national = 0;
    let state = 0;
    for (const s of schemes) {
      if (s.scheme_scope === "National") national += 1;
      else state += 1;
      byCategory[canonicalCategory(s.category)] += 1;
    }

    const { count: familyCount } = await supabaseAdmin
      .from("family_members")
      .select("id", { count: "exact", head: true })
      .eq("citizen_profile_id", data.citizen_profile_id);

    return {
      totalEligible: schemes.length,
      national,
      state,
      family: familyCount ?? 0,
      byCategory,
      hasProfile: !!profile,
      hasAssessment: schemeIds.length > 0,
    };
  });

export const getHouseholdImpactFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => profileSchema.parse(data))
  .handler(async ({ data }): Promise<HouseholdImpact> => {
    const empty: HouseholdImpact = {
      familyMemberCount: 0,
      familyRecommendations: 0,
      familyByCategory: emptyByCategory(),
    };
    if (!data.citizen_profile_id) return empty;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: members } = await supabaseAdmin
      .from("family_members")
      .select("id")
      .eq("citizen_profile_id", data.citizen_profile_id);

    const memberCount = members?.length ?? 0;
    // Family recommendations aren't persisted yet; approximate as the most recent
    // eligibility assessment scheme list, broken down by category. This keeps
    // the dashboard meaningful without changing existing services.
    const { data: assessment } = await supabaseAdmin
      .from("eligibility_assessments")
      .select("recommended_scheme_ids")
      .eq("citizen_profile_id", data.citizen_profile_id)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const ids: string[] = assessment?.recommended_scheme_ids ?? [];
    const byCategory = emptyByCategory();
    if (ids.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from("government_schemes")
        .select("category")
        .in("id", ids);
      for (const r of rows ?? []) byCategory[canonicalCategory(r.category)] += 1;
    }

    return {
      familyMemberCount: memberCount,
      familyRecommendations: ids.length,
      familyByCategory: byCategory,
    };
  });
