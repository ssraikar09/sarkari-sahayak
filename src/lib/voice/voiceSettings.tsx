import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { ReactNode } from "react";
import {
  DEFAULT_VOICE_LANGUAGE,
  VOICE_LANGUAGES,
  type VoiceLanguageCode,
} from "./languageConfig";

const LANG_KEY = "sahayak.voice.language";
const ACCESSIBILITY_KEY = "sahayak.voice.accessibility";
const ADVANCED_KEY = "sahayak.voice.advancedMultilingual";

type VoiceSettings = {
  language: VoiceLanguageCode;
  accessibilityMode: boolean;
  advancedMultilingual: boolean;
  setLanguage: (l: VoiceLanguageCode) => void;
  setAccessibilityMode: (v: boolean) => void;
  toggleAccessibilityMode: () => void;
  setAdvancedMultilingual: (v: boolean) => void;
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

function readAdvanced(): boolean {
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(ADVANCED_KEY) === "1";
}

export function VoiceSettingsProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<VoiceLanguageCode>(DEFAULT_VOICE_LANGUAGE);
  const [accessibilityMode, setAccessibilityModeState] = useState<boolean>(false);
  const [advancedMultilingual, setAdvancedMultilingualState] = useState<boolean>(false);

  useEffect(() => {
    setLanguageState(readLang());
    setAccessibilityModeState(readAccessibility());
    setAdvancedMultilingualState(readAdvanced());
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

  const setAdvancedMultilingual = useCallback((v: boolean) => {
    setAdvancedMultilingualState(v);
    if (typeof window !== "undefined") {
      window.localStorage.setItem(ADVANCED_KEY, v ? "1" : "0");
    }
  }, []);

  const value = useMemo<VoiceSettings>(
    () => ({
      language,
      accessibilityMode,
      advancedMultilingual,
      setLanguage,
      setAccessibilityMode,
      toggleAccessibilityMode,
      setAdvancedMultilingual,
    }),
    [language, accessibilityMode, advancedMultilingual, setLanguage, setAccessibilityMode, toggleAccessibilityMode, setAdvancedMultilingual],
  );

  return (
    <VoiceSettingsContext.Provider value={value}>{children}</VoiceSettingsContext.Provider>
  );
}

export function useVoiceSettings(): VoiceSettings {
  const ctx = useContext(VoiceSettingsContext);
  if (!ctx) {
    const noop = () => {};
    return {
      language: DEFAULT_VOICE_LANGUAGE,
      accessibilityMode: false,
      advancedMultilingual: false,
      setLanguage: noop,
      setAccessibilityMode: noop,
      toggleAccessibilityMode: noop,
      setAdvancedMultilingual: noop,
    };
  }
  return ctx;
}
