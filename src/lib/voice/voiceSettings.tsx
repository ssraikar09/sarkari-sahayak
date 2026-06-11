import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_VOICE_LANGUAGE,
  VOICE_LANGUAGES,
  type VoiceLanguageCode,
} from "./languageConfig";

const LANG_KEY = "sahayak.voice.language";
const ACCESSIBILITY_KEY = "sahayak.voice.accessibility";

type VoiceSettings = {
  language: VoiceLanguageCode;
  accessibilityMode: boolean;
  setLanguage: (l: VoiceLanguageCode) => void;
  setAccessibilityMode: (v: boolean) => void;
  toggleAccessibilityMode: () => void;
};

const VoiceSettingsContext = createContext<VoiceSettings | null>(null);

function readLang(): VoiceLanguageCode {
  if (typeof window === "undefined") return DEFAULT_VOICE_LANGUAGE;
  const v = window.localStorage.getItem(LANG_KEY) as VoiceLanguageCode | null;
  return VOICE_LANGUAGES.some((l) => l.code === v) ? (v as VoiceLanguageCode) : DEFAULT_VOICE_LANGUAGE;
}

function readAccessibility(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ACCESSIBILITY_KEY) === "1";
}

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<VoiceLanguageCode>(DEFAULT_VOICE_LANGUAGE);
  const [accessibilityMode, setAccessibilityModeState] = useState<boolean>(false);

  // Hydrate from localStorage post-mount to keep SSR deterministic.
  useEffect(() => {
    setLanguageState(readLang());
    setAccessibilityModeState(readAccessibility());
  }, []);

  const setLanguage = useCallback((l: VoiceLanguageCode) => {
    setLanguageState(l);
    if (typeof window !== "undefined") window.localStorage.setItem(LANG_KEY, l);
  }, []);

  const setAccessibilityMode = useCallback((v: boolean) => {
    setAccessibilityModeState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ACCESSIBILITY_KEY, v ? "1" : "0");
    }
  }, []);

  const toggleAccessibilityMode = useCallback(() => {
    setAccessibilityMode(!accessibilityMode);
  }, [accessibilityMode, setAccessibilityMode]);

  const value = useMemo<VoiceSettings>(
    () => ({
      language,
      accessibilityMode,
      setLanguage,
      setAccessibilityMode,
      toggleAccessibilityMode,
    }),
    [language, accessibilityMode, setLanguage, setAccessibilityMode, toggleAccessibilityMode],
  );

  return (
    <VoiceSettingsContext.Provider value={value}>{children}</VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings(): VoiceSettings {
  const ctx = useContext(VoiceSettingsContext);
  if (!ctx) {
    // Safe fallback so consumers don't crash if used outside provider.
    const noop = () => {};
    return {
      language: DEFAULT_VOICE_LANGUAGE,
      accessibilityMode: false,
      setLanguage: noop,
      setAccessibilityMode: noop,
      toggleAccessibilityMode: noop,
    };
  }
  return ctx;
}
