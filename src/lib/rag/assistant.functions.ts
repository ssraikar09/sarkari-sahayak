import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { AssistantResponse } from "./types";
import { getVoiceLanguage } from "@/lib/voice/languageConfig";
import { normalizeVoiceQuery } from "@/lib/voice/queryNormalizer";

const Input = z.object({
  query: z.string().trim().min(2).max(500),
  citizenProfileId: z.string().uuid().nullable().optional(),
  targetLanguage: z
    .enum(["en-IN", "hi-IN", "kn-IN", "ta-IN", "te-IN", "mr-IN"])
    .optional()
    .default("en-IN"),
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

    const targetLanguage = getVoiceLanguage(data.targetLanguage);
    const responseLanguage = `${targetLanguage.label}${targetLanguage.nativeLabel !== targetLanguage.label ? ` (${targetLanguage.nativeLabel})` : ""}`;
    const key = process.env.GEMINI_API_KEY;

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

    const normalizedQuery = normalizeVoiceQuery(data.query);
    const retrievalQuery = await buildEnglishRetrievalQuery(
      normalizedQuery,
      targetLanguage.short,
      key,
    );
    const intent = detectIntent(retrievalQuery);
    const retrieved = await retrieveSchemes(retrievalQuery, profile, intent);
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
        answer: getLocalizedTrustFallback(targetLanguage.short, TRUST_FALLBACK_MESSAGE),
        sources: [],
        intent,
        fallback: true,
        retrievedSchemeIds: [],
      };
    }

    if (!key) {
      return {
        answer:
          "The AI assistant is temporarily unavailable (missing GEMINI_API_KEY). Please try again later or browse schemes directly.",
        sources: toAssistantSources(retrieved),
        intent,
        fallback: true,
        retrievedSchemeIds: retrievedIds,
      };
    }

    const ctx = buildContext(
      retrievalQuery,
      data.query,
      responseLanguage,
      intent,
      profile,
      retrieved,
    );
    const systemPrompt = buildSystemPrompt(responseLanguage);
    const userPrompt = buildUserPrompt(ctx);

    try {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            system_instruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          }),
        },
      );

      if (!res.ok) {
        const errText = await res.text();
        throw new Error(`Gemini ${res.status}: ${errText}`);
      }

      const json = (await res.json()) as {
        candidates?: { content?: { parts?: { text?: string }[] } }[];
      };
      const text =
        json.candidates?.[0]?.content?.parts
          ?.map((p) => p.text ?? "")
          .join("")
          .trim() ?? "";

      if (!text) {
        throw new Error("Empty response from Gemini");
      }

      return {
        answer: text,
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
      if (lower.includes("429") || lower.includes("rate") || lower.includes("quota")) {
        userMsg =
          "The AI assistant is busy right now (rate limit reached). Please try again in a moment.";
      } else if (lower.includes("api key") || lower.includes("api_key") || lower.includes("permission")) {
        userMsg =
          "The AI assistant key is invalid. Please update GEMINI_API_KEY in project secrets.";
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

async function buildEnglishRetrievalQuery(
  query: string,
  targetShort: string,
  key: string | undefined,
): Promise<string> {
  const normalized = normalizeVoiceQuery(query).trim();
  if (!normalized) return query;
  if (!key || (targetShort === "en" && isMostlyEnglish(normalized))) {
    return normalized;
  }

  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          system_instruction: {
            parts: [
              {
                text:
                  "Translate Indian welfare/government-scheme questions into concise English for database search. Preserve scheme names such as PM-KISAN, Mudra Yojana, Ayushman Bharat, PM Awas Yojana, Atal Pension Yojana, and Sukanya Samriddhi Yojana. Return only the translated search query. If already English, return it unchanged.",
              },
            ],
          },
          contents: [{ role: "user", parts: [{ text: normalized }] }],
        }),
      },
    );
    if (!res.ok) return normalized;
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[];
    };
    const translated =
      json.candidates?.[0]?.content?.parts
        ?.map((p) => p.text ?? "")
        .join("")
        .replace(/^['"]|['"]$/g, "")
        .trim() ?? "";
    return translated ? normalizeVoiceQuery(translated).slice(0, 500) : normalized;
  } catch (err) {
    console.warn("Assistant query translation failed", err);
    return normalized;
  }
}

function isMostlyEnglish(text: string): boolean {
  const letters = text.replace(/[^\p{L}]/gu, "");
  if (!letters) return true;
  const latin = text.replace(/[^A-Za-z]/g, "");
  return latin.length / letters.length > 0.75;
}

function getLocalizedTrustFallback(short: string, english: string): string {
  const messages: Record<string, string> = {
    hi: "हम आपके प्रश्न से जुड़ी सत्यापित जानकारी Sarkari Sahayak के ज्ञान आधार में नहीं ढूंढ पाए।",
    kn: "ನಿಮ್ಮ ಪ್ರಶ್ನೆಗೆ ಸಂಬಂಧಿಸಿದ ಪರಿಶೀಲಿತ ಮಾಹಿತಿಯನ್ನು Sarkari Sahayak ಜ್ಞಾನಾಧಾರದಲ್ಲಿ ಕಂಡುಹಿಡಿಯಲಾಗಲಿಲ್ಲ.",
    ta: "உங்கள் கேள்விக்கு தொடர்பான சரிபார்க்கப்பட்ட தகவலை Sarkari Sahayak அறிவு தளத்தில் கண்டறிய முடியவில்லை.",
    te: "మీ ప్రశ్నకు సంబంధించిన ధృవీకరించిన సమాచారాన్ని Sarkari Sahayak జ్ఞానాధారంలో కనుగొనలేకపోయాం.",
    mr: "आपल्या प्रश्नाशी संबंधित पडताळलेली माहिती Sarkari Sahayak च्या ज्ञानाधारात सापडली नाही.",
  };
  return messages[short] ?? english;
}

