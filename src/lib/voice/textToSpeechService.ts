/* Lightweight wrapper around window.speechSynthesis with an AI TTS fallback
 * (ElevenLabs multilingual) used whenever no native voice exists for the
 * requested language. */

import { synthesizeSpeech } from "./elevenlabsTts.functions";

const TTS_FALLBACK_LANG = "en-IN";
const TTS_FALLBACK_LANG_2 = "en-US";

let speechRunId = 0;
let activeAudio: HTMLAudioElement | null = null;
let activeAudioUrl: string | null = null;

export function isSpeechSynthesisSupported(): boolean {
  // Either the native browser API or our remote TTS fallback works.
  return typeof window !== "undefined";
}

function stopActiveAudio() {
  if (activeAudio) {
    try {
      activeAudio.pause();
      activeAudio.src = "";
    } catch {
      /* noop */
    }
    activeAudio = null;
  }
  if (activeAudioUrl) {
    try {
      URL.revokeObjectURL(activeAudioUrl);
    } catch {
      /* noop */
    }
    activeAudioUrl = null;
  }
}

function pickVoice(lang: string): SpeechSynthesisVoice | null {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return null;
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
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return resolve();
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
  stopActiveAudio();
  if (typeof window !== "undefined" && "speechSynthesis" in window) {
    try {
      window.speechSynthesis.cancel();
    } catch {
      /* noop */
    }
  }
}

const INDIC_LANGS = new Set(["hi", "te", "ta", "kn", "mr", "bn", "gu", "ml", "pa", "or", "as"]);

export function speak(text: string, opts: SpeakOptions): void {
  if (typeof window === "undefined") return;
  const clean = stripMarkdownForSpeech(text);
  if (!clean) return;

  cancelSpeech();
  const runId = speechRunId;

  const prefix = opts.lang.split("-")[0]?.toLowerCase() ?? "";
  pickVoice(opts.lang);
  // Remote AI TTS disabled (workspace credits exhausted); always use the
  // built-in browser speech synthesis, falling back to English if needed.
  const needsRemote = false;
  void prefix;

  if (needsRemote) {
    void speakWithRemoteTts(clean, opts, runId);
    return;
  }

  if (!("speechSynthesis" in window)) {
    // No native voice; try remote even for English as a last resort.
    void speakWithRemoteTts(clean, opts, runId);
    return;
  }

  speakWithBrowserTts(clean, opts, runId);
}

async function speakWithRemoteTts(
  text: string,
  opts: SpeakOptions,
  runId: number,
): Promise<void> {
  try {
    const { audioContent } = await synthesizeSpeech({ data: { text } });
    if (runId !== speechRunId) return;
    const url = `data:audio/mpeg;base64,${audioContent}`;
    const audio = new Audio(url);
    activeAudio = audio;
    activeAudioUrl = null; // data URI doesn't need revoking
    audio.onplay = () => {
      if (runId === speechRunId) opts.onStart?.();
    };
    audio.onended = () => {
      if (runId === speechRunId) {
        opts.onEnd?.();
        activeAudio = null;
      }
    };
    audio.onerror = () => {
      if (runId !== speechRunId) return;
      activeAudio = null;
      // Fall back to native browser TTS if remote playback fails.
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        speakWithBrowserTts(text, opts, runId);
      } else {
        opts.onError?.("Voice output failed.");
      }
    };
    await audio.play();
  } catch (err) {
    if (runId !== speechRunId) return;
    // Network/API failure → fall back to browser TTS so user still hears something.
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      speakWithBrowserTts(text, opts, runId);
      opts.onFallback?.();
    } else {
      opts.onError?.((err as Error).message || "Voice output failed.");
    }
  }
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
    const code = err.error ?? "unknown";
    // Treat benign/transient cases as a normal end so we don't spam errors.
    if (
      code === "interrupted" ||
      code === "canceled" ||
      code === "not-allowed" ||
      code === "synthesis-failed" ||
      code === "audio-busy"
    ) {
      opts.onEnd?.();
      return;
    }
    opts.onError?.(`Voice output failed (${code}).`);
  };


  const assignVoice = () => {
    let voice = pickVoice(opts.lang);
    let usedLang = voice?.lang ?? opts.lang;

    if (!voice) {
      voice = pickVoice(TTS_FALLBACK_LANG) ?? pickVoice(TTS_FALLBACK_LANG_2);
      usedLang = voice?.lang ?? TTS_FALLBACK_LANG;
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

