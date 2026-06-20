import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().default("alloy"),
});

// Map legacy ElevenLabs voice IDs to Lovable AI (OpenAI) voices
const VOICE_MAP: Record<string, string> = {
  EXAVITQu4vr4xnSDxMaL: "alloy",
};

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      throw new Error("AI voice is not configured for this project.");
    }

    const voice = VOICE_MAP[data.voiceId] ?? data.voiceId ?? "alloy";

    const res = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "openai/gpt-4o-mini-tts",
        input: data.text,
        voice,
        response_format: "mp3",
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 402) {
        throw new Error("AI credits exhausted. Please add credits to continue using voice.");
      }
      if (res.status === 429) {
        throw new Error("Rate limit reached. Please try again shortly.");
      }
      throw new Error(errText || `TTS failed: ${res.status}`);
    }

    const buf = await res.arrayBuffer();
    const audioContent = Buffer.from(buf).toString("base64");
    return { audioContent };
  });
