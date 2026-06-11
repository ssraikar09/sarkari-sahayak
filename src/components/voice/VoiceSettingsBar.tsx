import { Accessibility, Languages } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { VOICE_LANGUAGES, type VoiceLanguageCode } from "@/lib/voice/languageConfig";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";

type Props = {
  className?: string;
  showAccessibilityToggle?: boolean;
  compact?: boolean;
};

export function VoiceSettingsBar({
  className,
  showAccessibilityToggle = true,
  compact = false,
}: Props) {
  const { language, setLanguage, accessibilityMode, setAccessibilityMode } =
    useVoiceSettings();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-2 px-3 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Languages className="size-4 text-muted-foreground" aria-hidden />
        <Label htmlFor="voice-lang" className="text-xs text-muted-foreground">
          Voice language
        </Label>
        <Select
          value={language}
          onValueChange={(v) => setLanguage(v as VoiceLanguageCode)}
        >
          <SelectTrigger
            id="voice-lang"
            className={cn("h-8 min-w-[8rem]", compact && "min-w-[6.5rem]")}
            aria-label="Voice language"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {VOICE_LANGUAGES.map((l) => (
              <SelectItem key={l.code} value={l.code}>
                <span className="font-medium">{l.label}</span>
                <span className="ml-2 text-xs text-muted-foreground">
                  {l.nativeLabel}
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
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
      <p className="w-full text-xs text-muted-foreground">
        Voice input supports multiple languages. Audio responses are currently
        provided in English for consistent accessibility.
      </p>
    </div>
  );
}
