/* Lightweight wrapper around window.speechSynthesis.
 * Honors the requested language but falls back to English voices when no
 * regional voice is installed in the browser. */

const TTS_FALLBACK_LANG = "en-IN";
const TTS_FALLBACK_LANG_2 = "en-US";

export function isSpeechSynthesisSupported(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (!isSpeechSynthesisSupported()) return null;
  const voices = window.speechSynthesis.getVoices();
  if (voices.length === 0) return null;
  const exact = voices.find((v) => v.lang === lang);
  if (exact) return exact;
  const prefix = lang.split("-")[0];
  const prefixed = voices.find((v) => v.lang.toLowerCase().startsWith(prefix.toLowerCase()));
  return prefixed ?? null;
}

/** True if the browser ships a voice matching the requested language. */
export function hasVoiceFor(lang: string): boolean {
  return pickVoice(lang) !== null;
}

/* Some browsers populate voices asynchronously. */
export function ensureVoicesLoaded(): Promise<void> {
  return new Promise((resolve) => {
    if (!isSpeechSynthesisSupported()) return resolve();
    const ready = window.speechSynthesis.getVoices();
    if (ready.length > 0) return resolve();
    const handler = () => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
      resolve();
    }, 1500);
  });
}

export type SpeakOptions = {
  lang: string;
  rate?: number;
  pitch?: number;
  onStart?: () => void;
  onEnd?: () => void;
  onError?: (message: string) => void;
  /** Called if we had to fall back to an English voice. */
  onFallback?: () => void;
};

export function stripMarkdownForSpeech(text: string): string {
  return text
    .replace(/```[\s\S]*?```/g, " ")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/[*_#>~-]{1,3}/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cancelSpeech(): void {
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    /* noop */
  }
}

export async function speak(text: string, opts: SpeakOptions): Promise<void> {
  if (!isSpeechSynthesisSupported()) {
    opts.onError?.("Voice features are not supported on this device.");
    return;
  }
  const clean = stripMarkdownForSpeech(text);
  if (!clean) return;
  await ensureVoicesLoaded();
  cancelSpeech();

  const utter = new SpeechSynthesisUtterance(clean);
  let voice = pickVoice(opts.lang);
  let usedLang = opts.lang;
  if (!voice) {
    voice = pickVoice(TTS_FALLBACK_LANG) ?? pickVoice(TTS_FALLBACK_LANG_2);
    usedLang = voice?.lang ?? TTS_FALLBACK_LANG;
    if (opts.lang.split("-")[0] !== "en") {
      opts.onFallback?.();
    }
  }
  utter.lang = usedLang;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  if (voice) utter.voice = voice;
  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onerror = (e) => {
    const err = e as SpeechSynthesisErrorEvent;
    if (err.error === "interrupted" || err.error === "canceled") {
      opts.onEnd?.();
      return;
    }
    opts.onError?.(`Voice output failed (${err.error ?? "unknown"}).`);
  };
  window.speechSynthesis.speak(utter);
}
