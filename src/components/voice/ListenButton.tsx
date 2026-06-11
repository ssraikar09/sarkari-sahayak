import { useEffect, useRef, useState } from "react";
import { Square, Volume2, VolumeX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
} from "@/lib/voice/textToSpeechService";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";

type Props = {
  text: string;
  autoPlay?: boolean;
  className?: string;
  size?: "icon" | "sm" | "default";
  label?: string;
};

export function ListenButton({
  text,
  autoPlay = false,
  className,
  size = "sm",
  label = "Listen",
}: Props) {
  const { language, advancedMultilingual } = useVoiceSettings();
  const effectiveLang = advancedMultilingual ? language : "en-IN";
  const [playing, setPlaying] = useState(false);
  const [supported, setSupported] = useState(true);
  const autoPlayedRef = useRef(false);

  useEffect(() => {
    setSupported(isSpeechSynthesisSupported());
  }, []);

  useEffect(() => {
    return () => {
      cancelSpeech();
    };
  }, []);

  const start = () => {
    if (!supported || !text) return;
    setPlaying(true);
    void speak(text, {
      lang: effectiveLang,
      onEnd: () => setPlaying(false),
      onError: () => setPlaying(false),
    });
  };

  const stop = () => {
    cancelSpeech();
    setPlaying(false);
  };

  useEffect(() => {
    if (autoPlay && supported && !autoPlayedRef.current && text) {
      autoPlayedRef.current = true;
      start();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoPlay, supported, text]);

  if (!supported) {
    return (
      <Button
        type="button"
        size={size}
        variant="ghost"
        className={cn("text-muted-foreground", className)}
        disabled
        aria-label="Voice output not supported on this device"
        title="Voice output not supported on this device"
      >
        <VolumeX className="mr-1 size-3.5" aria-hidden />
        Listen unavailable
      </Button>
    );
  }

  return (
    <Button
      type="button"
      size={size}
      variant={playing ? "secondary" : "ghost"}
      className={className}
      onClick={() => (playing ? stop() : start())}
      aria-pressed={playing}
      aria-label={playing ? "Stop reading aloud" : "Listen to this content"}
    >
      {playing ? (
        <>
          <Square className="mr-1 size-3.5" aria-hidden />
          Stop
        </>
      ) : (
        <>
          <Volume2 className="mr-1 size-3.5" aria-hidden />
          {label}
        </>
      )}
    </Button>
  );
}
