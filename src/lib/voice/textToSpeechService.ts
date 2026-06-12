/* Lightweight wrapper around window.speechSynthesis.
 * Honors the requested language but falls back to English voices when no
 * regional voice is installed in the browser. */

const TTS_FALLBACK_LANG = "en-IN";
const TTS_FALLBACK_LANG_2 = "en-US";

let speechRunId = 0;

export function isSpeechSynthesisSupported(): boolean {
  return (
    typeof window !== "undefined" &&
    "speechSynthesis" in window
  );
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
  if (typeof Audio === "undefined") return false;
  const chunks = splitForRemoteTts(text, REMOTE_TTS_CHARS);
  if (chunks.length === 0) return false;

  const audio = new Audio();
  activeAudio = audio;
  audio.preload = "auto";
  let index = 0;
  let started = false;
  let failedOver = false;

  const failToBrowser = () => {
    if (failedOver || runId !== speechRunId) return;
    failedOver = true;
    stopActiveAudio();
    speakWithBrowserTts(text, opts, runId);
  };

  const playCurrent = () => {
    if (runId !== speechRunId) return;
    audio.src = buildRemoteTtsDataUrl(chunks[index], opts.lang);
    void audio
      .play()
      .then(() => {
        if (!started && runId === speechRunId) {
          started = true;
          opts.onStart?.();
        }
      })
      .catch(failToBrowser);
  };

  audio.onended = () => {
    if (runId !== speechRunId) return;
    index += 1;
    if (index < chunks.length) {
      playCurrent();
      return;
    }
    stopActiveAudio();
    opts.onEnd?.();
  };
  audio.onerror = failToBrowser;

  playCurrent();
  return true;
}

function buildRemoteTtsDataUrl(text: string, lang: string): string {
  const speakable = encodeURIComponent(text);
  const language = encodeURIComponent(getShortLang(lang));
  const html = `<!doctype html><html><body><script>
    const u = 'https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${language}&q=${speakable}';
    fetch(u).then(r => r.blob()).then(b => {
      parent.postMessage({ type: 'tts-audio', url: URL.createObjectURL(b) }, '*');
    }).catch(() => parent.postMessage({ type: 'tts-error' }, '*'));
  </script></body></html>`;
  return `data:text/html;charset=utf-8,${encodeURIComponent(html)}`;
}

function stopActiveAudio(): void {
  if (!activeAudio) return;
  try {
    activeAudio.onended = null;
    activeAudio.onerror = null;
    activeAudio.pause();
    activeAudio.removeAttribute("src");
    activeAudio.load();
  } catch {
    /* noop */
  }
  activeAudio = null;
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

