import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  CheckCircle2,
  ClipboardCopy,
  ExternalLink,
  FileText,
  Gift,
  Headphones,
  ListChecks,
  MapPin,
  MessageCircle,
  Mic,
  RotateCcw,
  ShieldCheck,
  Sparkles,
  Square,
  Volume2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { askAssistant } from "@/lib/rag/assistant.functions";
import { getStoredProfileId } from "@/lib/citizen-profile/storage";
import type { AssistantMessage, AssistantSource } from "@/lib/rag/types";
import { toast } from "sonner";
import { MicButton } from "@/components/voice/MicButton";
import { VoiceSettingsBar } from "@/components/voice/VoiceSettingsBar";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";
import { normalizeVoiceQuery } from "@/lib/voice/queryNormalizer";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
  stripMarkdownForSpeech,
} from "@/lib/voice/textToSpeechService";
import { translateFromEnglish } from "@/lib/voice/translationService";
import {
  VOICE_LANGUAGES,
  getVoiceLanguage,
  type VoiceLanguageCode,
} from "@/lib/voice/languageConfig";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "AI Welfare Assistant — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Ask questions about government schemes and get trustworthy, source-cited answers from Sarkari Sahayak's verified knowledge base.",
      },
      {
        property: "og:title",
        content: "AI Welfare Assistant — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Explainable, verified scheme answers powered by Sarkari Sahayak's Hybrid RAG engine.",
      },
    ],
  }),
  component: AssistantPage,
});

const SUGGESTED_PROMPTS: { title: string; q: string }[] = [
  { title: "Eligibility check", q: "What schemes am I eligible for?" },
  { title: "Explain a scheme", q: "Explain PM-KISAN in simple language." },
  { title: "Documents required", q: "What documents are required for Mudra Yojana?" },
  { title: "By group", q: "Suggest schemes for students." },
];

type NarrationStatus =
  | { kind: "idle" }
  | { kind: "playing"; langLabel: string; fallback: boolean }
  | { kind: "ended" };

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const { advancedMultilingual, language } = useVoiceSettings();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [lastAssistantId, setLastAssistantId] = useState<string | null>(null);
  const [narration, setNarration] = useState<NarrationStatus>({ kind: "idle" });
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const autoPlayedRef = useRef<Set<string>>(new Set());

  const effectiveLang: VoiceLanguageCode = advancedMultilingual ? language : "en-IN";
  const selectedLangMeta = getVoiceLanguage(effectiveLang);

  useEffect(() => {
    setProfileId(getStoredProfileId());
  }, []);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages, loading]);

  useEffect(() => () => cancelSpeech(), []);

  const playNarration = (text: string) => {
    if (!isSpeechSynthesisSupported()) return;
    cancelSpeech();
    const clean = stripMarkdownForSpeech(text);
    if (!clean) return;
    setNarration({
      kind: "playing",
      langLabel: selectedLangMeta.label,
      fallback: false,
    });
    speak(clean, {
      lang: effectiveLang,
      onEnd: () => setNarration({ kind: "ended" }),
      onError: () => setNarration({ kind: "ended" }),
      onFallback: () =>
        setNarration({
          kind: "playing",
          langLabel: selectedLangMeta.label,
          fallback: true,
        }),
    });
  };

  const stopNarration = () => {
    cancelSpeech();
    setNarration({ kind: "ended" });
  };

  const submit = async (raw: string) => {
    const original = raw.trim();
    if (!original || loading) return;
    cancelSpeech();
    setNarration({ kind: "idle" });
    const query = normalizeVoiceQuery(original);

    const userMsg: AssistantMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: original,
      createdAt: new Date().toISOString(),
    };
    setMessages((m) => [...m, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const res = await ask({ data: { query, citizenProfileId: profileId } });
      let displayContent = res.answer;
      if (advancedMultilingual && language !== "en-IN") {
        const t = await translateFromEnglish(res.answer, language);
        if (t.translated) {
          displayContent = t.text;
        } else {
          toast.message(
            "Regional translation is currently unavailable. Showing English text.",
          );
        }
      }
      const reply: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: displayContent,
        sources: res.sources,
        fallback: res.fallback,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, reply]);
      setLastAssistantId(reply.id);

      // Auto-narrate after render.
      if (!autoPlayedRef.current.has(reply.id)) {
        autoPlayedRef.current.add(reply.id);
        // Small delay so the bubble paints first.
        setTimeout(() => playNarration(displayContent), 200);
      }
    } catch (err) {
      console.error(err);
      setMessages((m) => [
        ...m,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content:
            "Something went wrong while reaching the assistant. Please try again.",
          fallback: true,
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setLoading(false);
      requestAnimationFrame(() => textareaRef.current?.focus());
    }
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLTextAreaElement> = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void submit(input);
    }
  };

  const voiceAvailable = useMemo(() => isSpeechSynthesisSupported(), []);

  return (
    <main className="flex min-h-screen flex-col bg-gradient-to-b from-background to-accent/30">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Hybrid RAG
          </Badge>
        </div>

        <header className="mb-4">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Welfare Assistant
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Ask about eligibility, documents, benefits or any scheme. Every
            answer is grounded in Sarkari Sahayak's verified database.
          </p>
        </header>

        <VoiceSettingsBar className="mb-3" />

        <NarrationStatusBar status={narration} onStop={stopNarration} />

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6"
        >
          {messages.length === 0 ? (
            <EmptyState
              onPick={(p) => void submit(p)}
              voiceAvailable={voiceAvailable}
              activeLang={selectedLangMeta.label}
            />
          ) : (
            messages.map((m) => (
              <MessageBubble
                key={m.id}
                message={m}
                isLastAssistant={m.id === lastAssistantId}
                isNarrating={
                  narration.kind === "playing" && m.id === lastAssistantId
                }
                onReplay={() => playNarration(m.content)}
                onStop={stopNarration}
              />
            ))
          )}
          {loading ? <TypingIndicator /> : null}
        </div>

        <form
          className="mt-4 flex items-end gap-2 rounded-2xl border bg-card p-2 shadow-sm"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(input);
          }}
        >
          <MicButton
            onTranscript={(t) => {
              setInput(t);
              void submit(t);
            }}
            onPartial={(t) => setInput(t)}
            onError={(m) => toast.error(m)}
            disabled={loading}
            className="size-10"
          />
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={onKeyDown}
            rows={1}
            placeholder="Ask a question or tap the mic to speak…"
            className="min-h-11 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
            aria-label="Message the assistant"
          />
          <Button
            type="submit"
            size="icon"
            className="size-10 shrink-0"
            disabled={!input.trim() || loading}
            aria-label="Send"
          >
            <ArrowUp className="size-4" />
          </Button>
        </form>
        <p className="mt-2 text-center text-xs text-muted-foreground">
          Answers are generated from verified schemes only. Always confirm
          critical details on the official link.
        </p>
      </div>
    </main>
  );
}

function NarrationStatusBar({
  status,
  onStop,
}: {
  status: NarrationStatus;
  onStop: () => void;
}) {
  if (status.kind !== "playing") return null;
  return (
    <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-primary/30 bg-primary/5 px-3 py-2 text-xs text-foreground">
      <div className="flex items-center gap-2">
        <Headphones className="size-3.5 text-primary" aria-hidden />
        {status.fallback ? (
          <span>
            <span className="font-medium">{status.langLabel}</span> voice
            unavailable. Playing English narration.
          </span>
        ) : (
          <span>
            Narrating in <span className="font-medium">{status.langLabel}</span>
            …
          </span>
        )}
      </div>
      <Button
        type="button"
        size="sm"
        variant="ghost"
        className="h-7 px-2 text-xs"
        onClick={onStop}
      >
        <Square className="mr-1 size-3" aria-hidden />
        Stop
      </Button>
    </div>
  );
}

function EmptyState({
  onPick,
  voiceAvailable,
  activeLang,
}: {
  onPick: (prompt: string) => void;
  voiceAvailable: boolean;
  activeLang: string;
}) {
  return (
    <div className="space-y-6 py-4 sm:py-8">
      <div className="text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
          <MessageCircle className="size-7" aria-hidden />
        </div>
        <h2 className="mt-3 text-lg font-semibold text-foreground">
          Welcome to your AI Welfare Assistant
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Ask about schemes, eligibility, benefits or documents.
        </p>
      </div>

      <div className="mx-auto grid max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p.q}
            type="button"
            onClick={() => onPick(p.q)}
            className="group rounded-xl border bg-background px-4 py-3 text-left transition hover:border-primary/40 hover:bg-accent"
          >
            <div className="text-[11px] font-semibold uppercase tracking-wide text-primary/80">
              {p.title}
            </div>
            <div className="mt-0.5 text-sm text-foreground group-hover:text-foreground">
              {p.q}
            </div>
          </button>
        ))}
      </div>

      <div className="mx-auto max-w-xl space-y-3 rounded-xl border bg-background/60 p-3">
        <div>
          <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            Supported Languages
          </div>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {VOICE_LANGUAGES.map((l) => (
              <Badge
                key={l.code}
                variant={l.label === activeLang ? "default" : "secondary"}
                className="text-[11px]"
              >
                {l.label}
                {l.short !== "en" ? ` · ${l.nativeLabel}` : ""}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          {voiceAvailable ? (
            <>
              <CheckCircle2 className="size-3.5 text-emerald-600" aria-hidden />
              <span>
                Voice assistant available · Mic input and narration ready
              </span>
            </>
          ) : (
            <>
              <Mic className="size-3.5" aria-hidden />
              <span>
                Voice features may be limited on this device. Text mode works
                normally.
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

type Section = { key: string; title: string; icon: typeof BookOpen; body: string };

const SECTION_MAP: { match: RegExp; title: string; icon: typeof BookOpen; key: string }[] = [
  { key: "summary", match: /^(summary|overview|about)/i, title: "Summary", icon: BookOpen },
  { key: "eligibility", match: /eligib/i, title: "Eligibility", icon: ShieldCheck },
  { key: "benefits", match: /benefit/i, title: "Benefits", icon: Gift },
  { key: "documents", match: /(document|paper)/i, title: "Documents Required", icon: FileText },
  { key: "process", match: /(apply|application|process|how to)/i, title: "Application Process", icon: ListChecks },
];

function parseSections(markdown: string): Section[] | null {
  // Split by H1/H2/H3 markdown headings.
  const regex = /^#{1,3}\s+(.+)$/gm;
  const matches: { title: string; index: number; headingLen: number }[] = [];
  let m: RegExpExecArray | null;
  while ((m = regex.exec(markdown)) !== null) {
    matches.push({ title: m[1].trim(), index: m.index, headingLen: m[0].length });
  }
  if (matches.length < 2) return null;
  const sections: Section[] = [];
  for (let i = 0; i < matches.length; i++) {
    const cur = matches[i];
    const next = matches[i + 1];
    const bodyStart = cur.index + cur.headingLen;
    const bodyEnd = next ? next.index : markdown.length;
    const body = markdown.slice(bodyStart, bodyEnd).trim();
    const mapped = SECTION_MAP.find((s) => s.match.test(cur.title));
    if (!mapped) continue;
    if (sections.some((s) => s.key === mapped.key)) continue;
    sections.push({ key: mapped.key, title: mapped.title, icon: mapped.icon, body });
  }
  return sections.length >= 2 ? sections : null;
}

function MessageBubble({
  message,
  isLastAssistant,
  isNarrating,
  onReplay,
  onStop,
}: {
  message: AssistantMessage;
  isLastAssistant: boolean;
  isNarrating: boolean;
  onReplay: () => void;
  onStop: () => void;
}) {
  const isUser = message.role === "user";
  const sections = !isUser ? parseSections(message.content) : null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(stripMarkdownForSpeech(message.content));
      toast.success("Response copied");
    } catch {
      toast.error("Could not copy to clipboard");
    }
  };

  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "max-w-[92%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground shadow-sm ring-1 ring-border",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            {sections ? (
              <div className="space-y-2">
                {sections.map((s) => {
                  const Icon = s.icon;
                  return (
                    <div
                      key={s.key}
                      className="rounded-xl border bg-card/60 p-3"
                    >
                      <div className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                        <Icon className="size-3.5" aria-hidden />
                        {s.title}
                      </div>
                      <div className="prose prose-sm max-w-none text-foreground prose-p:my-1 prose-ul:my-1 prose-headings:hidden prose-strong:text-foreground">
                        <ReactMarkdown>{s.body}</ReactMarkdown>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-strong:text-foreground">
                <ReactMarkdown>{message.content}</ReactMarkdown>
              </div>
            )}

            <div className="mt-2 flex flex-wrap items-center gap-1.5">
              {isNarrating ? (
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  className="h-7 px-2 text-xs"
                  onClick={onStop}
                >
                  <Square className="mr-1 size-3" aria-hidden />
                  Stop narration
                </Button>
              ) : (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="h-7 px-2 text-xs"
                  onClick={onReplay}
                >
                  <Volume2 className="mr-1 size-3" aria-hidden />
                  {isLastAssistant ? "Replay" : "Listen"}
                </Button>
              )}
              <Button
                type="button"
                size="sm"
                variant="ghost"
                className="h-7 px-2 text-xs"
                onClick={copy}
              >
                <ClipboardCopy className="mr-1 size-3" aria-hidden />
                Copy
              </Button>
            </div>

            {message.fallback &&
            (!message.sources || message.sources.length === 0) ? (
              <TrustFallbackActions />
            ) : null}
            {message.sources && message.sources.length > 0 ? (
              <VerifiedSources sources={message.sources} />
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}

function VerifiedSources({ sources }: { sources: AssistantSource[] }) {
  return (
    <div className="mt-3 rounded-xl border bg-accent/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden />
        Verified Sources
      </div>
      <ul className="mt-2 space-y-1.5">
        {sources.map((s) => (
          <li key={s.id} className="flex items-start gap-2 text-xs">
            <Badge
              variant="secondary"
              className="mt-0.5 gap-1 px-1.5 py-0 text-[10px]"
            >
              <MapPin className="size-2.5" />
              {s.scheme_scope === "National" ? "National" : s.state}
            </Badge>
            <div className="min-w-0 flex-1">
              <Link
                to="/schemes/$id"
                params={{ id: s.id }}
                className="font-medium text-foreground hover:text-primary"
              >
                {s.scheme_name}
              </Link>
              {s.official_link ? (
                <a
                  href={s.official_link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="ml-2 inline-flex items-center gap-0.5 text-muted-foreground hover:text-primary"
                >
                  Official link
                  <ExternalLink className="size-3" aria-hidden />
                </a>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function TrustFallbackActions() {
  return (
    <div className="mt-3 flex flex-wrap gap-2">
      <Button asChild size="sm" variant="outline">
        <Link to="/schemes">
          <BookOpen className="mr-1 size-3.5" />
          Browse Schemes
        </Link>
      </Button>
      <Button asChild size="sm" variant="outline">
        <a
          href="https://www.myscheme.gov.in/"
          target="_blank"
          rel="noopener noreferrer"
        >
          <ExternalLink className="mr-1 size-3.5" />
          Official Resources
        </a>
      </Button>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1.5 rounded-2xl bg-background px-4 py-3 text-sm text-muted-foreground shadow-sm ring-1 ring-border">
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.2s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.1s]" />
        <span className="size-2 animate-bounce rounded-full bg-muted-foreground" />
        <span className="ml-1">Thinking…</span>
      </div>
    </div>
  );
}
