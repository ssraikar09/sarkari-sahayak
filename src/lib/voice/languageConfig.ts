export type VoiceLanguageCode =
  | "en-IN"
  | "hi-IN"
  | "kn-IN"
  | "ta-IN"
  | "te-IN"
  | "bn-IN"
  | "mr-IN"
  | "gu-IN"
  | "ml-IN"
  | "pa-IN"
  | "or-IN"
  | "ur-IN";

export type VoiceLanguageShort =
  | "en"
  | "hi"
  | "kn"
  | "ta"
  | "te"
  | "bn"
  | "mr"
  | "gu"
  | "ml"
  | "pa"
  | "or"
  | "ur";

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
  { code: "bn-IN", label: "Bengali", nativeLabel: "বাংলা", short: "bn" },
  { code: "mr-IN", label: "Marathi", nativeLabel: "मराठी", short: "mr" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు", short: "te" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்", short: "ta" },
  { code: "gu-IN", label: "Gujarati", nativeLabel: "ગુજરાતી", short: "gu" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ", short: "kn" },
  { code: "ml-IN", label: "Malayalam", nativeLabel: "മലയാളം", short: "ml" },
  { code: "pa-IN", label: "Punjabi", nativeLabel: "ਪੰਜਾਬੀ", short: "pa" },
  { code: "or-IN", label: "Odia", nativeLabel: "ଓଡ଼ିଆ", short: "or" },
  { code: "ur-IN", label: "Urdu", nativeLabel: "اردو", short: "ur" },
];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "en-IN";

export function getVoiceLanguage(code: string | null | undefined): VoiceLanguage {
  return (
    VOICE_LANGUAGES.find((l) => l.code === code) ??
    VOICE_LANGUAGES.find((l) => l.code === DEFAULT_VOICE_LANGUAGE)!
  );
}
