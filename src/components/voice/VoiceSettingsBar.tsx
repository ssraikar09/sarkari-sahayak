import { Accessibility, Languages } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";

type Props = {
  className?: string;
  showAccessibilityToggle?: boolean;
  compact?: boolean;
};

export function VoiceSettingsBar({
  className,
  showAccessibilityToggle = true,
}: Props) {
  const { accessibilityMode, setAccessibilityMode } = useVoiceSettings();

  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 rounded-xl border bg-card/60 p-2 px-3 text-sm shadow-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Languages className="size-4 text-muted-foreground" aria-hidden />
        <span className="text-xs text-muted-foreground">Voice Language:</span>
        <span className="text-xs font-medium text-foreground">English</span>
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
        Voice interaction currently supports English for optimal recognition
        accuracy in the MVP. Future versions will support multilingual voice
        understanding.
      </p>
    </div>
  );
}
