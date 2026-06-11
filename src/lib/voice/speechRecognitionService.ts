/* Lightweight wrapper around the Web Speech API (SpeechRecognition).
 * Gracefully reports unsupported environments. */

type SpeechRecognitionLike = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((e: unknown) => void) | null;
  onerror: ((e: unknown) => void) | null;
  onend: ((e: unknown) => void) | null;
  onstart: ((e: unknown) => void) | null;
};

type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

function getCtor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function isSpeechRecognitionSupported(): boolean {
  return getCtor() !== null;
}

export type RecognitionCallbacks = {
  onPartial?: (text: string) => void;
  onFinal: (text: string) => void;
  onError?: (message: string) => void;
  onEnd?: () => void;
  onStart?: () => void;
};

export type RecognitionHandle = {
  stop: () => void;
};

export function startRecognition(
  lang: string,
  callbacks: RecognitionCallbacks,
): RecognitionHandle | null {
  const Ctor = getCtor();
  if (!Ctor) {
    callbacks.onError?.("Voice features are not supported on this device.");
    return null;
  }
  let recognition: SpeechRecognitionLike;
  try {
    recognition = new Ctor();
  } catch {
    callbacks.onError?.("Voice features are not supported on this device.");
    return null;
  }
  recognition.lang = lang;
  recognition.continuous = false;
  recognition.interimResults = true;

  recognition.onstart = () => callbacks.onStart?.();
  recognition.onresult = (e: unknown) => {
    const ev = e as {
      results: ArrayLike<
        ArrayLike<{ transcript: string }> & { isFinal: boolean }
      >;
    };
    let interim = "";
    let final = "";
    for (let i = 0; i < ev.results.length; i++) {
      const result = ev.results[i];
      const transcript = result[0]?.transcript ?? "";
      if (result.isFinal) final += transcript;
      else interim += transcript;
    }
    if (interim) callbacks.onPartial?.(interim.trim());
    if (final) callbacks.onFinal(final.trim());
  };
  recognition.onerror = (e: unknown) => {
    const err = e as { error?: string; message?: string };
    const code = err.error ?? err.message ?? "unknown";
    if (code === "not-allowed" || code === "service-not-allowed") {
      callbacks.onError?.("Microphone permission was denied.");
    } else if (code === "no-speech") {
      callbacks.onError?.("No speech detected. Please try again.");
    } else if (code === "audio-capture") {
      callbacks.onError?.("No microphone was found.");
    } else {
      callbacks.onError?.(`Voice input failed (${code}).`);
    }
  };
  recognition.onend = () => callbacks.onEnd?.();

  try {
    recognition.start();
  } catch (e) {
    callbacks.onError?.((e as Error).message || "Could not start the microphone.");
    return null;
  }

  return {
    stop: () => {
      try {
        recognition.stop();
      } catch {
        /* noop */
      }
    },
  };
}
