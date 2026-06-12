export type VoiceLanguageCode =
  | "en-IN"
  | "hi-IN"
  | "kn-IN"
  | "ta-IN"
  | "te-IN"
  | "mr-IN";

export type VoiceLanguageShort =
  | "en"
  | "hi"
  | "kn"
  | "ta"
  | "te"
  | "mr";

export type VoiceLanguage = {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
  /** ISO 639-1 short code used by translation APIs. */
  short: VoiceLanguageShort;
};

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English", nativeLabel: "English", short: "en" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी", short: "hi" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు", short: "te" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்", short: "ta" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ", short: "kn" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी", short: "mr" },
];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "en-IN";

export function getVoiceLanguage(code: string | null | undefined): VoiceLanguage {
  return (
    VOICE_LANGUAGES.find((l) => l.code === code) ??
    VOICE_LANGUAGES.find((l) => l.code === DEFAULT_VOICE_LANGUAGE)!
  );
}
