import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const InputSchema = z.object({
  text: z.string().min(1).max(5000),
  voiceId: z.string().default("EXAVITQu4vr4xnSDxMaL"),
});

export const synthesizeSpeech = createServerFn({ method: "POST" })
  .inputValidator((data) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) {
      throw new Error("AI voice is not connected to this project.");
    }

    const res = await fetch(
      `https://api.elevenlabs.io/v1/text-to-speech/${data.voiceId}?output_format=mp3_44100_128`,
      {
        method: "POST",
        headers: {
          "xi-api-key": apiKey,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          text: data.text,
          model_id: "eleven_multilingual_v2",
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
            style: 0.3,
            use_speaker_boost: true,
          },
        }),
      },
    );

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(errText || `TTS failed: ${res.status}`);
    }

    const buf = await res.arrayBuffer();
    const audioContent = Buffer.from(buf).toString("base64");
    return { audioContent };
  });
