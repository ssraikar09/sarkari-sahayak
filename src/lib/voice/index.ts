export {
  VOICE_LANGUAGES,
  DEFAULT_VOICE_LANGUAGE,
  getVoiceLanguage,
  type VoiceLanguage,
  type VoiceLanguageCode,
} from "./languageConfig";
export {
  isSpeechRecognitionSupported,
  startRecognition,
  type RecognitionCallbacks,
  type RecognitionHandle,
} from "./speechRecognitionService";
export {
  isSpeechSynthesisSupported,
  speak,
  cancelSpeech,
  stripMarkdownForSpeech,
  ensureVoicesLoaded,
  type SpeakOptions,
} from "./textToSpeechService";
export {
  VoiceSettingsProvider,
  useVoiceSettings,
} from "./voiceSettings";
