export type VoiceLanguageCode = "en-IN";

export type VoiceLanguage = {
  code: VoiceLanguageCode;
  label: string;
  nativeLabel: string;
};

export const VOICE_LANGUAGES: VoiceLanguage[] = [
  { code: "en-IN", label: "English", nativeLabel: "English" },
];

export const DEFAULT_VOICE_LANGUAGE: VoiceLanguageCode = "en-IN";

export function getVoiceLanguage(code: string | null | undefined): VoiceLanguage {
  return (
    VOICE_LANGUAGES.find((l) => l.code === code) ??
    VOICE_LANGUAGES.find((l) => l.code === DEFAULT_VOICE_LANGUAGE)!
  );
}
