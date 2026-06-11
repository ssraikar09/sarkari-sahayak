import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AssistantResponse } from "./types";

const Input = z.object({
  query: z.string().trim().min(2).max(500),
  citizenProfileId: z.string().uuid().nullable().optional(),
});

/**
 * RAG pipeline server entry point.
 * 1. Detect intent.
 * 2. Retrieve verified schemes (hybrid lexical + profile-aware).
 * 3. If no schemes match → return deterministic trust fallback (no model call).
 * 4. Otherwise build context and ask Lovable AI to answer using only that context.
 * 5. Attach verified sources and persist an analytics row.
 */
export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<AssistantResponse> => {
    const { detectIntent } = await import("./intent");
    const { retrieveSchemes } = await import("./retrievalEngine");
    const { buildContext, buildSystemPrompt, buildUserPrompt } = await import(
      "./contextBuilder"
    );
    const { toAssistantSources, TRUST_FALLBACK_MESSAGE } = await import(
      "./sourceAttribution"
    );

    const intent = detectIntent(data.query);

    // Load citizen profile (admin client — public RAG endpoint).
    const { supabaseAdmin } = await import(
      "@/integrations/supabase/client.server"
    );

    let profile = null;
    if (data.citizenProfileId) {
      const { data: row } = await supabaseAdmin
        .from("citizen_profiles" as never)
        .select("*")
        .eq("id", data.citizenProfileId)
        .maybeSingle();
      profile = (row as never) ?? null;
    }

    const retrieved = await retrieveSchemes(data.query, profile);
    const retrievedIds = retrieved.map((r) => r.scheme.id);

    // Log the query for analytics. Never let logging break the response.
    try {
      await supabaseAdmin.from("assistant_queries" as never).insert({
        query: data.query,
        citizen_profile_id: data.citizenProfileId ?? null,
        retrieved_scheme_ids: retrievedIds,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (e) {
      console.warn("Failed to log assistant query", e);
    }

    // Trust layer: no verified schemes → deterministic fallback, no AI call.
    if (retrieved.length === 0) {
      return {
        answer: TRUST_FALLBACK_MESSAGE,
        sources: [],
        intent,
        fallback: true,
        retrievedSchemeIds: [],
      };
    }

    const key = process.env.LOVABLE_API_KEY;
    if (!key) {
      return {
        answer:
          "The AI assistant is temporarily unavailable. Please try again later or browse schemes directly.",
        sources: toAssistantSources(retrieved),
        intent,
        fallback: true,
        retrievedSchemeIds: retrievedIds,
      };
    }

    const { createLovableAiGatewayProvider } = await import(
      "@/lib/ai-gateway.server"
    );
    const { generateText } = await import("ai");

    const ctx = buildContext(data.query, intent, profile, retrieved);
    const gateway = createLovableAiGatewayProvider(key);

    try {
      const { text } = await generateText({
        model: gateway("google/gemini-3-flash-preview"),
        system: buildSystemPrompt(),
        prompt: buildUserPrompt(ctx),
      });

      return {
        answer: text.trim(),
        sources: toAssistantSources(retrieved),
        intent,
        fallback: false,
        retrievedSchemeIds: retrievedIds,
      };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      const lower = message.toLowerCase();
      let userMsg =
        "The AI assistant could not generate a response right now. Please try again shortly.";
      if (lower.includes("429") || lower.includes("rate")) {
        userMsg =
          "The AI assistant is busy right now (rate limit reached). Please try again in a moment.";
      } else if (lower.includes("402") || lower.includes("credit")) {
        userMsg =
          "AI credits for this workspace are exhausted. Please add credits in Settings → Workspace → Usage.";
      }
      console.error("Assistant generation failed", err);
      return {
        answer: userMsg,
        sources: toAssistantSources(retrieved),
        intent,
        fallback: true,
        retrievedSchemeIds: retrievedIds,
      };
    }
  });
