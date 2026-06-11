/* Client-side translation. Uses Google's public translate endpoint (no key)
 * with MyMemory as a fallback. Translates paragraph-by-paragraph so long
 * answers come through complete instead of being truncated.
 *
 * Falls back to the original English text on total failure so the user
 * always sees a response. */

import { getVoiceLanguage, type VoiceLanguageCode } from "./languageConfig";

const GOOGLE_ENDPOINT = "https://translate.googleapis.com/translate_a/single";
const MYMEMORY_ENDPOINT = "https://api.mymemory.translated.net/get";
const CHUNK_CHARS = 1500; // safe under Google's ~5000 char per-request limit

export type TranslationResult = {
  text: string;
  translated: boolean;
};

export async function translateFromEnglish(
  text: string,
  targetLang: VoiceLanguageCode,
): Promise<TranslationResult> {
  const lang = getVoiceLanguage(targetLang);
  if (lang.short === "en" || !text.trim()) {
    return { text, translated: false };
  }

  // Translate block-by-block so markdown structure (paragraphs, bullets) is
  // preserved in the output.
  const blocks = text.split(/\n/);
  const out: string[] = [];
  let anyTranslated = false;
  let anyFailed = false;

  for (const block of blocks) {
    if (!block.trim()) {
      out.push(block);
      continue;
    }
    // Preserve markdown leading markers ("- ", "* ", "1. ", "## ").
    const m = block.match(/^(\s*(?:[-*]|\d+\.|#{1,6})\s+)?(.*)$/);
    const prefix = m?.[1] ?? "";
    const body = m?.[2] ?? block;

    const chunks = splitIntoChunks(body, CHUNK_CHARS);
    const translatedChunks: string[] = [];
    for (const chunk of chunks) {
      const t = await translateChunk(chunk, lang.short);
      if (t === null) {
        anyFailed = true;
        translatedChunks.push(chunk);
      } else {
        anyTranslated = true;
        translatedChunks.push(t);
      }
    }
    out.push(prefix + translatedChunks.join(" "));
  }

  if (!anyTranslated) return { text, translated: false };
  // Partial success still counts as translated; UI keeps the regional copy.
  void anyFailed;
  return { text: out.join("\n"), translated: true };
}

async function translateChunk(
  chunk: string,
  short: string,
): Promise<string | null> {
  // 1) Google public endpoint
  try {
    const url =
      `${GOOGLE_ENDPOINT}?client=gtx&sl=en&tl=${short}&dt=t&q=${encodeURIComponent(chunk)}`;
    const res = await fetch(url);
    if (res.ok) {
      const data = (await res.json()) as unknown;
      const joined = extractGoogleText(data);
      if (joined) return joined;
    }
  } catch {
    /* fall through */
  }

  // 2) MyMemory fallback (smaller per-call limit, so chunk further)
  try {
    const pieces = splitIntoChunks(chunk, 480);
    const parts: string[] = [];
    for (const p of pieces) {
      const url = `${MYMEMORY_ENDPOINT}?q=${encodeURIComponent(p)}&langpair=en|${short}`;
      const res = await fetch(url);
      if (!res.ok) return null;
      const json = (await res.json()) as {
        responseData?: { translatedText?: string };
      };
      const t = json.responseData?.translatedText;
      if (!t) return null;
      parts.push(t);
    }
    return parts.join(" ");
  } catch {
    return null;
  }
}

function extractGoogleText(data: unknown): string | null {
  if (!Array.isArray(data) || !Array.isArray(data[0])) return null;
  const segments = data[0] as Array<unknown>;
  const out: string[] = [];
  for (const seg of segments) {
    if (Array.isArray(seg) && typeof seg[0] === "string") {
      out.push(seg[0] as string);
    }
  }
  const joined = out.join("");
  return joined.trim() ? joined : null;
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
