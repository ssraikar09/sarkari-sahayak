/* Lightweight wrapper around window.speechSynthesis.
 * Honors the requested language but falls back to English voices when no
 * regional voice is installed in the browser. */

const TTS_FALLBACK_LANG = "en-IN";
const TTS_FALLBACK_LANG_2 = "en-US";
const REMOTE_TTS_LANGS = new Set([
  "hi",
  "te",
  "ta",
  "kn",
  "bn",
  "mr",
  "gu",
  "ml",
  "pa",
]);
const REMOTE_TTS_CHARS = 180;

let activeBlobUrl: string | null = null;
let speechRunId = 0;

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    ("speechSynthesis" in window || typeof Audio !== "undefined")
  );
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
  speechRunId += 1;
  revokeActiveAudioUrl();
  if (!isSpeechSynthesisSupported()) return;
  try {
    window.speechSynthesis?.cancel();
  } catch {
    /* noop */
  }
}

export function speak(text: string, opts: SpeakOptions): void {
  if (!isSpeechSynthesisSupported()) {
    opts.onError?.("Voice features are not supported on this device.");
    return;
  }
  const clean = stripMarkdownForSpeech(text);
  if (!clean) return;

  cancelSpeech();
  const runId = speechRunId;

  if (shouldUseRemoteTts(opts.lang) && speakWithRemoteTts(clean, opts, runId)) {
    return;
  }

  speakWithBrowserTts(clean, opts, runId);
}

function speakWithBrowserTts(text: string, opts: SpeakOptions, runId: number): void {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) {
    opts.onError?.("Voice features are not supported on this device.");
    return;
  }

  // Build utterance synchronously inside the user gesture so browsers
  // (Chrome/Safari) don't block playback due to lost activation context.
  const utter = new SpeechSynthesisUtterance(text);
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  utter.onstart = () => {
    if (runId === speechRunId) opts.onStart?.();
  };
  utter.onend = () => {
    if (runId === speechRunId) opts.onEnd?.();
  };
  utter.onerror = (e) => {
    if (runId !== speechRunId) return;
    const err = e as SpeechSynthesisErrorEvent;
    if (err.error === "interrupted" || err.error === "canceled") {
      opts.onEnd?.();
      return;
    }
    opts.onError?.(`Voice output failed (${err.error ?? "unknown"}).`);
  };

  const assignVoice = () => {
    let voice = pickVoice(opts.lang);
    const prefix = opts.lang.split("-")[0];
    let usedLang = voice?.lang ?? opts.lang;
    if (!voice && prefix === "en") {
      voice = pickVoice(TTS_FALLBACK_LANG) ?? pickVoice(TTS_FALLBACK_LANG_2);
      usedLang = voice?.lang ?? TTS_FALLBACK_LANG;
    } else if (!voice) {
      opts.onFallback?.();
    }
    utter.lang = usedLang;
    if (voice) utter.voice = voice;
  };

  const synth = window.speechSynthesis;
  // If something is currently speaking, cancel first. Chrome can get into a
  // "paused" state — resume defensively before speaking the new utterance.
  if (synth.speaking || synth.pending) {
    synth.cancel();
  }

  const voicesReady = synth.getVoices().length > 0;
  let started = false;
  const startSpeaking = () => {
    if (started || runId !== speechRunId) return;
    started = true;
    assignVoice();
    synth.speak(utter);
    if (synth.paused) synth.resume();
  };

  if (voicesReady) {
    startSpeaking();
  } else {
    // Voices not loaded yet — wait briefly, then speak. Still in same task
    // chain so the activation context is preserved on most browsers.
    const handler = () => {
      synth.removeEventListener("voiceschanged", handler);
      startSpeaking();
    };
    synth.addEventListener("voiceschanged", handler);
    setTimeout(() => {
      synth.removeEventListener("voiceschanged", handler);
      startSpeaking();
    }, 250);
  }
}

function shouldUseRemoteTts(lang: string): boolean {
  return REMOTE_TTS_LANGS.has(getShortLang(lang));
}

function getShortLang(lang: string): string {
  return lang.split("-")[0].toLowerCase();
}

function speakWithRemoteTts(text: string, opts: SpeakOptions, runId: number): boolean {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return false;
  const chunks = splitForRemoteTts(text, REMOTE_TTS_CHARS);
  if (chunks.length === 0) return false;

  const lang = getShortLang(opts.lang);
  const markup = chunks
    .map((chunk) => `<voice name="${lang}">${escapeSsml(chunk)}</voice>`)
    .join("<break time=\"180ms\"/>");
  const blob = new Blob([markup], { type: "application/ssml+xml" });
  revokeActiveAudioUrl();
  activeBlobUrl = URL.createObjectURL(blob);

  const utter = new SpeechSynthesisUtterance(activeBlobUrl);
  utter.lang = opts.lang;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  utter.onstart = () => {
    if (runId === speechRunId) opts.onStart?.();
  };
  utter.onend = () => {
    if (runId !== speechRunId) return;
    revokeActiveAudioUrl();
    opts.onEnd?.();
  };
  utter.onerror = () => {
    if (runId !== speechRunId) return;
    revokeActiveAudioUrl();
    speakWithBrowserTts(text, opts, runId);
  };

  const synth = window.speechSynthesis;
  synth.speak(utter);
  if (synth.paused) synth.resume();
  return true;
}

function revokeActiveAudioUrl(): void {
  if (!activeBlobUrl || typeof URL === "undefined") return;
  try {
    URL.revokeObjectURL(activeBlobUrl);
  } catch {
    /* noop */
  }
  activeBlobUrl = null;
}

function escapeSsml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/\'/g, "&apos;");
}

function splitForRemoteTts(text: string, max: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const chunks: string[] = [];
  let current = "";
  for (const word of words) {
    const next = current ? `${current} ${word}` : word;
    if (next.length > max) {
      if (current) chunks.push(current);
      if (word.length > max) {
        for (let i = 0; i < word.length; i += max) chunks.push(word.slice(i, i + max));
        current = "";
      } else {
        current = word;
      }
    } else {
      current = next;
    }
  }
  if (current) chunks.push(current);
  return chunks;
}

