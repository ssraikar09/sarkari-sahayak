export type VoiceLanguageCode = "en-IN" | "hi-IN" | "kn-IN" | "ta-IN" | "te-IN";

export type VoiceLanguage = {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
};

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English", nativeLabel: "English" },
  { code: "hi-IN", label: "Hindi", nativeLabel: "हिन्दी" },
  { code: "kn-IN", label: "Kannada", nativeLabel: "ಕನ್ನಡ" },
  { code: "ta-IN", label: "Tamil", nativeLabel: "தமிழ்" },
  { code: "te-IN", label: "Telugu", nativeLabel: "తెలుగు" },
];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "en-IN";

export function getVoiceLanguage(code: string | null | undefined): VoiceLanguage {
  return (
    VOICE_LANGUAGES.find((l) => l.code === code) ??
    VOICE_LANGUAGES.find((l) => l.code === DEFAULT_VOICE_LANGUAGE)!
  );
}
