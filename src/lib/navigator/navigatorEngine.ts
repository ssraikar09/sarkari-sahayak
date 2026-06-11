import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { WelfareActionPlan } from "./types";

const Input = z.object({
  goalText: z.string().trim().min(3).max(500),
  citizenProfileId: z.string().uuid().nullable().optional(),
});

/**
 * AI Welfare Navigator: converts a natural-language life goal into a
 * verified, explainable welfare action plan. Reuses the Hybrid RAG
 * retrieval layer and the citizen profile.
 */
export const buildWelfarePlan = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<WelfareActionPlan> => {
    const { classifyGoal } = await import("./goalClassifier");
    const { buildActionPlan, buildPlanRationale } = await import("./actionPlanner");
    const { retrieveSchemes } = await import("@/lib/rag/retrievalEngine");
    const { toAssistantSources } = await import("@/lib/rag/sourceAttribution");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const classification = classifyGoal(data.goalText);

    let profile = null;
    if (data.citizenProfileId) {
      const { data: row } = await supabaseAdmin
        .from("citizen_profiles" as never)
        .select("*")
        .eq("id", data.citizenProfileId)
        .maybeSingle();
      profile = (row as never) ?? null;
    }

    // Compose a richer retrieval query using the detected category.
    const enrichedQuery = `${data.goalText} ${classification.category}`;
    const retrieved = await retrieveSchemes(enrichedQuery, profile, "discovery");
    const schemes = retrieved.map((r) => r.scheme);

    const steps = buildActionPlan(classification, schemes, profile);
    const rationale = buildPlanRationale(classification, schemes, profile);
    const sources = toAssistantSources(retrieved);

    // Log usage analytics — never break the response on failure.
    try {
      await supabaseAdmin.from("navigator_usage_logs" as never).insert({
        citizen_profile_id: data.citizenProfileId ?? null,
        goal_text: data.goalText,
        goal_category: classification.category,
        recommended_scheme_ids: schemes.map((s) => s.id),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (err) {
      console.warn("Failed to log navigator usage", err);
    }

    return {
      goalText: data.goalText,
      classification,
      steps,
      sources,
      fallback: schemes.length === 0,
      rationale,
      generatedAt: new Date().toISOString(),
    };
  });
