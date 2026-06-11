import { useEffect, useRef, useState } from "react";
import { Mic, MicOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  isSpeechRecognitionSupported,
  startRecognition,
  type RecognitionHandle,
} from "@/lib/voice/speechRecognitionService";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";

type Props = {
  onTranscript: (text: string) => void;
  onPartial?: (text: string) => void;
  onError?: (message: string) => void;
  disabled?: boolean;
  className?: string;
  size?: "icon" | "sm" | "default";
};

export function MicButton({
  onTranscript,
  onPartial,
  onError,
  disabled,
  className,
  size = "icon",
}: Props) {
  const { language } = useVoiceSettings();
  const [listening, setListening] = useState(false);
  const [supported, setSupported] = useState(true);
  const handleRef = useRef<RecognitionHandle | null>(null);

  useEffect(() => {
    setSupported(isSpeechRecognitionSupported());
  }, []);

  useEffect(() => {
    return () => {
      handleRef.current?.stop();
      handleRef.current = null;
    };
  }, []);

  const stop = () => {
    handleRef.current?.stop();
    handleRef.current = null;
    setListening(false);
  };

  const start = () => {
    if (!supported) {
      onError?.("Voice features are not supported on this device.");
      return;
    }
    handleRef.current = startRecognition(language, {
      onStart: () => setListening(true),
      onPartial: (t) => onPartial?.(t),
      onFinal: (t) => {
        onTranscript(t);
      },
      onError: (m) => {
        setListening(false);
        handleRef.current = null;
        onError?.(m);
      },
      onEnd: () => {
        setListening(false);
        handleRef.current = null;
      },
    });
  };

  return (
    <Button
      type="button"
      size={size}
      variant={listening ? "default" : "outline"}
      className={cn("shrink-0", listening && "animate-pulse", className)}
      onClick={() => (listening ? stop() : start())}
      disabled={disabled || !supported}
      aria-pressed={listening}
      aria-label={
        !supported
          ? "Voice input not supported on this device"
          : listening
            ? "Stop voice input"
            : "Start voice input"
      }
      title={
        !supported
          ? "Voice input not supported on this device"
          : listening
            ? "Stop voice input"
            : "Start voice input"
      }
    >
      {listening ? (
        <Loader2 className="size-4 animate-spin" aria-hidden />
      ) : supported ? (
        <Mic className="size-4" aria-hidden />
      ) : (
        <MicOff className="size-4" aria-hidden />
      )}
    </Button>
  );
}
