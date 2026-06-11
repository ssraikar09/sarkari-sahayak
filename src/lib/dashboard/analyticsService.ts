import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AssistantInsights, ApplicationProgress } from "./dashboardTypes";

export const getAssistantInsightsFn = createServerFn({ method: "GET" })
  .inputValidator(() => ({}))
  .handler(async (): Promise<AssistantInsights> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { count: totalQueries } = await supabaseAdmin
      .from("assistant_queries")
      .select("id", { count: "exact", head: true });

    // Top retrieved schemes
    const { data: recent } = await supabaseAdmin
      .from("assistant_queries")
      .select("retrieved_scheme_ids")
      .order("created_at", { ascending: false })
      .limit(200);

    const schemeCounts = new Map<string, number>();
    for (const row of recent ?? []) {
      const ids: string[] = row.retrieved_scheme_ids ?? [];
      for (const id of ids) schemeCounts.set(id, (schemeCounts.get(id) ?? 0) + 1);
    }
    const topIds = [...schemeCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    let topSchemes: AssistantInsights["topSchemes"] = [];
    if (topIds.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from("government_schemes")
        .select("id, scheme_name, category")
        .in(
          "id",
          topIds.map(([id]) => id),
        );
      topSchemes = topIds.map(([id, count]) => {
        const r = rows?.find((x) => x.id === id);
        return { id, name: r?.scheme_name ?? "Unknown scheme", count };
      });
    }

    // Top categories — derived from search logs and from categories of top schemes
    const categoryCounts = new Map<string, number>();
    const { data: searchRows } = await supabaseAdmin
      .from("scheme_search_logs")
      .select("search_query")
      .order("created_at", { ascending: false })
      .limit(500);
    const CATEGORY_HINTS = [
      "Farmer",
      "Women",
      "Student",
      "Senior",
      "Entrepreneur",
      "Health",
    ];
    for (const r of searchRows ?? []) {
      const q = (r.search_query ?? "").toLowerCase();
      for (const c of CATEGORY_HINTS) {
        if (q.includes(c.toLowerCase()))
          categoryCounts.set(c, (categoryCounts.get(c) ?? 0) + 1);
      }
    }
    if (topIds.length > 0) {
      const { data: rows } = await supabaseAdmin
        .from("government_schemes")
        .select("id, category")
        .in(
          "id",
          topIds.map(([id]) => id),
        );
      for (const r of rows ?? []) {
        const cat = r.category ?? "Other";
        const w = schemeCounts.get(r.id) ?? 1;
        categoryCounts.set(cat, (categoryCounts.get(cat) ?? 0) + w);
      }
    }
    const topCategories = [...categoryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([category, count]) => ({ category, count }));

    return {
      totalQueries: totalQueries ?? 0,
      topCategories,
      topSchemes,
    };
  });

const progressSchema = z.object({
  citizen_profile_id: z.string().uuid().nullable(),
  summariesDownloaded: z.number().int().min(0).max(100000),
});

export const getApplicationProgressFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => progressSchema.parse(data))
  .handler(async ({ data }): Promise<ApplicationProgress> => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let guidesOpened = 0;
    if (data.citizen_profile_id) {
      const { count } = await supabaseAdmin
        .from("application_guide_usage")
        .select("id", { count: "exact", head: true })
        .eq("citizen_profile_id", data.citizen_profile_id);
      guidesOpened = count ?? 0;
    } else {
      const { count } = await supabaseAdmin
        .from("application_guide_usage")
        .select("id", { count: "exact", head: true });
      guidesOpened = count ?? 0;
    }
    return {
      guidesOpened,
      summariesDownloaded: data.summariesDownloaded,
    };
  });
