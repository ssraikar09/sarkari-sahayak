/* Lightweight wrapper around window.speechSynthesis. */

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
  const prefixed = voices.find((v) => v.lang.startsWith(prefix));
  return prefixed ?? null;
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
    // Safety timeout
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
};

/* Strip markdown so TTS reads plain prose. */
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
  utter.lang = opts.lang;
  utter.rate = opts.rate ?? 1;
  utter.pitch = opts.pitch ?? 1;
  const voice = pickVoice(opts.lang);
  if (voice) utter.voice = voice;
  utter.onstart = () => opts.onStart?.();
  utter.onend = () => opts.onEnd?.();
  utter.onerror = (e) => {
    const err = e as SpeechSynthesisErrorEvent;
    // 'interrupted' / 'canceled' happen on natural stop — don't surface.
    if (err.error === "interrupted" || err.error === "canceled") {
      opts.onEnd?.();
      return;
    }
    opts.onError?.(`Voice output failed (${err.error ?? "unknown"}).`);
  };
  window.speechSynthesis.speak(utter);
}
