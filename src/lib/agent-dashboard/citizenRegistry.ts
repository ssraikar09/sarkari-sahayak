import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type {
  ApplicationStatus,
  CitizenAssistanceRow,
  CitizenRegistryEntry,
  CitizenWorkflow,
} from "./types";

const inputSchema = z.object({
  search: z.string().trim().max(200).optional().default(""),
  limit: z.number().int().min(1).max(200).optional().default(50),
});

function deriveStatus(workflow: {
  guidesOpened: number;
  navigatorPlansGenerated: number;
  hasAssessment: boolean;
}): ApplicationStatus {
  if (workflow.guidesOpened >= 3 && workflow.navigatorPlansGenerated >= 1)
    return "Submitted";
  if (workflow.guidesOpened > 0 || workflow.navigatorPlansGenerated > 0)
    return "In Progress";
  if (workflow.hasAssessment) return "In Progress";
  return "Not Started";
}

function bucketRisk(score: number): "High" | "Moderate" | "Low" {
  if (score >= 75) return "Low";
  if (score >= 40) return "Moderate";
  return "High";
}

export const listAssistedCitizensFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => inputSchema.parse(data ?? {}))
  .handler(async ({ data }): Promise<CitizenAssistanceRow[]> => {
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );
    const { computeOpportunityScore } = await import(
      "@/lib/welfare-gap/opportunityScorer"
    );
    const { estimateAnnualValue } = await import(
      "@/lib/welfare-gap/benefitEstimator"
    );

    let q = supabaseAdmin
      .from("citizen_profiles")
      .select(
        "id, full_name, state, district, age, occupation, preferred_language, created_at",
      )
      .order("created_at", { ascending: false })
      .limit(data.limit);

    const term = data.search.trim();
    if (term) {
      // Search by id (exact) OR name (ilike). Postgrest `or` filter.
      const safe = term.replace(/[%_,()]/g, "");
      const isUuid =
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
          term,
        );
      q = isUuid
        ? q.or(`full_name.ilike.%${safe}%,id.eq.${term}`)
        : q.ilike("full_name", `%${safe}%`);
    }

    const { data: profiles, error } = await q;
    if (error) throw error;
    const profileIds = (profiles ?? []).map((p) => p.id);
    if (profileIds.length === 0) return [];

    const [familyRes, assessmentsRes, guidesRes, navRes, schemesRes] =
      await Promise.all([
        supabaseAdmin
          .from("family_members")
          .select("citizen_profile_id")
          .in("citizen_profile_id", profileIds),
        supabaseAdmin
          .from("eligibility_assessments")
          .select("citizen_profile_id, recommended_scheme_ids, created_at")
          .in("citizen_profile_id", profileIds)
          .order("created_at", { ascending: false }),
        supabaseAdmin
          .from("application_guide_usage")
          .select("citizen_profile_id, scheme_id")
          .in("citizen_profile_id", profileIds),
        supabaseAdmin
          .from("navigator_usage_logs")
          .select("citizen_profile_id, recommended_scheme_ids")
          .in("citizen_profile_id", profileIds),
        supabaseAdmin
          .from("government_schemes")
          .select("id, category, scheme_name, benefits"),
      ]);

    const familyCounts = new Map<string, number>();
    for (const f of familyRes.data ?? []) {
      if (!f.citizen_profile_id) continue;
      familyCounts.set(
        f.citizen_profile_id,
        (familyCounts.get(f.citizen_profile_id) ?? 0) + 1,
      );
    }

    const latestAssessment = new Map<string, string[]>();
    for (const a of assessmentsRes.data ?? []) {
      if (!latestAssessment.has(a.citizen_profile_id))
        latestAssessment.set(a.citizen_profile_id, a.recommended_scheme_ids ?? []);
    }

    const guidesByProfile = new Map<string, Set<string>>();
    const guideOpenCount = new Map<string, number>();
    for (const g of guidesRes.data ?? []) {
      if (!g.citizen_profile_id) continue;
      if (!guidesByProfile.has(g.citizen_profile_id))
        guidesByProfile.set(g.citizen_profile_id, new Set());
      guidesByProfile.get(g.citizen_profile_id)!.add(g.scheme_id);
      guideOpenCount.set(
        g.citizen_profile_id,
        (guideOpenCount.get(g.citizen_profile_id) ?? 0) + 1,
      );
    }

    const navByProfile = new Map<string, Set<string>>();
    const navCount = new Map<string, number>();
    for (const n of navRes.data ?? []) {
      if (!n.citizen_profile_id) continue;
      if (!navByProfile.has(n.citizen_profile_id))
        navByProfile.set(n.citizen_profile_id, new Set());
      const set = navByProfile.get(n.citizen_profile_id)!;
      for (const id of n.recommended_scheme_ids ?? []) set.add(id);
      navCount.set(
        n.citizen_profile_id,
        (navCount.get(n.citizen_profile_id) ?? 0) + 1,
      );
    }

    const schemeIndex = new Map<
      string,
      { id: string; category: string; scheme_name: string; benefits: string | null }
    >();
    for (const s of schemesRes.data ?? []) schemeIndex.set(s.id, s);

    const rows: CitizenAssistanceRow[] = [];
    for (const p of profiles ?? []) {
      const citizen: CitizenRegistryEntry = {
        id: p.id,
        fullName: p.full_name,
        state: p.state,
        district: p.district,
        age: p.age,
        occupation: p.occupation,
        preferredLanguage: p.preferred_language,
        familyMemberCount: familyCounts.get(p.id) ?? 0,
        hasAssessment: latestAssessment.has(p.id),
        createdAt: p.created_at,
      };

      const guidesOpened = guideOpenCount.get(p.id) ?? 0;
      const navigatorPlansGenerated = navCount.get(p.id) ?? 0;
      const status = deriveStatus({
        guidesOpened,
        navigatorPlansGenerated,
        hasAssessment: citizen.hasAssessment,
      });

      const workflow: CitizenWorkflow = {
        citizenProfileId: p.id,
        guidesOpened,
        // Each guide open implies summary view/download.
        summariesDownloaded: guidesByProfile.get(p.id)?.size ?? 0,
        navigatorPlansGenerated,
        applicationStatus: status,
      };

      const eligible = latestAssessment.get(p.id) ?? [];
      const explored = new Set<string>([
        ...(guidesByProfile.get(p.id) ?? []),
        ...(navByProfile.get(p.id) ?? []),
      ]);
      const totalExplored = eligible.filter((id) => explored.has(id)).length;
      const { score, tier } = computeOpportunityScore({
        totalEligible: eligible.length,
        totalExplored,
      });
      let benefitSum = 0;
      let missedCount = 0;
      for (const id of eligible) {
        if (explored.has(id)) continue;
        missedCount += 1;
        const s = schemeIndex.get(id);
        if (!s) continue;
        benefitSum += estimateAnnualValue({
          scheme_name: s.scheme_name,
          category: s.category,
          benefits: s.benefits,
        }).valueINR;
      }

      rows.push({
        citizen,
        workflow,
        household: {
          opportunityScore: score,
          tier,
          missedOpportunities: missedCount,
          estimatedAnnualBenefitINR: benefitSum,
          riskCategory: bucketRisk(score),
        },
      });
    }

    return rows;
  });
