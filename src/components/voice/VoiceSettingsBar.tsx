import { Accessibility, Globe2, Languages } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";
import {
  VOICE_LANGUAGES,
  getVoiceLanguage,
  type VoiceLanguageCode,
} from "@/lib/voice/languageConfig";

type Props = {
  className?: string;
  showAccessibilityToggle?: boolean;
  compact?: boolean;
};

export function VoiceSettingsBar({
  className,
  showAccessibilityToggle = true,
}: Props) {
  const {
    accessibilityMode,
    setAccessibilityMode,
    advancedMultilingual,
    setAdvancedMultilingual,
    language,
    setLanguage,
  } = useVoiceSettings();

  const selected = getVoiceLanguage(language);
  const inputLang = advancedMultilingual ? selected.label : "English";
  const outputLang = advancedMultilingual ? selected.label : "English";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-x-4 gap-y-2 rounded-xl border bg-card/60 p-2 px-3 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Languages className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">Voice Language:</span>
        {advancedMultilingual ? (
          <Select
            value={language}
            onValueChange={(v) => setLanguage(v as VoiceLanguageCode)}
          >
            <SelectTrigger className="h-7 w-[140px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {VOICE_LANGUAGES.map((l) => (
                <SelectItem key={l.code} value={l.code} className="text-xs">
                  {l.label} {l.short !== "en" ? `· ${l.nativeLabel}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <span className="text-xs font-medium text-foreground">English</span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <Globe2 className="size-4 text-muted-foreground" aria-hidden />
        <Label
          htmlFor="voice-advanced"
          className="cursor-pointer text-xs text-muted-foreground"
        >
          Advanced Multilingual
        </Label>
        <Switch
          id="voice-advanced"
          checked={advancedMultilingual}
          onCheckedChange={setAdvancedMultilingual}
          aria-label="Advanced Multilingual Mode"
        />
      </div>

      {showAccessibilityToggle ? (
        <div className="flex items-center gap-2">
          <Accessibility className="size-4 text-muted-foreground" aria-hidden />
          <Label
            htmlFor="voice-accessibility"
            className="cursor-pointer text-xs text-muted-foreground"
          >
            Voice Accessibility Mode
          </Label>
          <Switch
            id="voice-accessibility"
            checked={accessibilityMode}
            onCheckedChange={setAccessibilityMode}
            aria-label="Voice Accessibility Mode"
          />
        </div>
      ) : null}

      <div className="flex w-full flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-muted-foreground">
        <span>
          Input Language:{" "}
          <span className="font-medium text-foreground">{inputLang}</span>
        </span>
        <span>
          Output Language:{" "}
          <span className="font-medium text-foreground">{outputLang}</span>
        </span>
      </div>

      <p className="w-full text-xs text-muted-foreground">
        {advancedMultilingual
          ? "Speak in your selected language. Responses will be translated and narrated in that language when supported. If a regional voice is unavailable, English narration will be used."
          : "Voice interaction currently supports English for optimal recognition accuracy. Enable Advanced Multilingual to speak and listen in the 5 pilot-state languages: Hindi, Kannada, Marathi, Tamil, and Telugu."}
      </p>
    </div>
  );
}
