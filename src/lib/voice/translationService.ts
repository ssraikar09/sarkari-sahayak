/* Lightweight client-side translation using the free MyMemory API.
 * No API key required. Falls back to the original text on any failure so
 * the user always sees a response. */

import { getVoiceLanguage, type VoiceLanguageCode } from "./languageConfig";

const ENDPOINT = "https://api.mymemory.translated.net/get";
const MAX_CHARS = 480; // MyMemory query limit per call

export type TranslationResult = {
  text: string;
  translated: boolean;
};

/**
 * Translate English `text` to the language identified by `targetLang`.
 * If the target is English, the text is returned unchanged.
 * On any error, returns the original text with translated:false.
 */
export async function translateFromEnglish(
  text: string,
  targetLang: VoiceLanguageCode,
): Promise<TranslationResult> {
  const lang = getVoiceLanguage(targetLang);
  if (lang.short === "en" || !text.trim()) {
    return { text, translated: false };
  }
  try {
    const chunks = splitIntoChunks(text, MAX_CHARS);
    const translated: string[] = [];
    for (const chunk of chunks) {
      const url = `${ENDPOINT}?q=${encodeURIComponent(chunk)}&langpair=en|${lang.short}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`status ${res.status}`);
      const json = (await res.json()) as {
        responseData?: { translatedText?: string };
        responseStatus?: number;
      };
      const t = json.responseData?.translatedText;
      if (!t) throw new Error("empty translation");
      translated.push(t);
    }
    return { text: translated.join(" "), translated: true };
  } catch {
    return { text, translated: false };
  }
}

function splitIntoChunks(text: string, max: number): string[] {
  if (text.length <= max) return [text];
  const out: string[] = [];
  const sentences = text.split(/(?<=[.!?])\s+/);
  let buf = "";
  for (const s of sentences) {
    if ((buf + " " + s).trim().length > max) {
      if (buf) out.push(buf.trim());
      if (s.length > max) {
        // Hard split overly long sentence.
        for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
        buf = "";
      } else {
        buf = s;
      }
    } else {
      buf = (buf + " " + s).trim();
    }
  }
  if (buf) out.push(buf);
  return out;
}
