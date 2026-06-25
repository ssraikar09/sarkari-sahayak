import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import {
  ArrowLeft,
  ArrowUp,
  BookOpen,
  ExternalLink,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
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
import { ListenButton } from "@/components/voice/ListenButton";
import { VoiceSettingsBar } from "@/components/voice/VoiceSettingsBar";
import { useVoiceSettings } from "@/lib/voice/voiceSettings";
import {
  cancelSpeech,
  isSpeechSynthesisSupported,
  speak,
  stripMarkdownForSpeech,
} from "@/lib/voice/textToSpeechService";
import { getVoiceLanguage } from "@/lib/voice/languageConfig";

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

const SUGGESTED_PROMPTS: string[] = [
  "What schemes am I eligible for?",
  "Explain PM-KISAN.",
  "What documents are required for Mudra Yojana?",
  "Suggest schemes for students.",
];

function AssistantPage() {
  const ask = useServerFn(askAssistant);
  const { advancedMultilingual, language } = useVoiceSettings();
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);
  const [lastAssistantId, setLastAssistantId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

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

  // Auto-narrate the latest assistant reply once it has fully rendered.
  const narratedRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!lastAssistantId || loading) return;
    if (narratedRef.current.has(lastAssistantId)) return;
    const reply = messages.find((m) => m.id === lastAssistantId);
    if (!reply || reply.role !== "assistant") return;
    const clean = stripMarkdownForSpeech(reply.content);
    if (!clean) return;
    narratedRef.current.add(lastAssistantId);

    const effectiveLang = advancedMultilingual ? language : "en-IN";
    const meta = getVoiceLanguage(effectiveLang);
    if (!isSpeechSynthesisSupported()) {
      console.warn("[voice] Speech synthesis not supported on this device.");
      return;
    }
    // Wait for the bubble to paint before speaking to avoid race conditions.
    const t = window.setTimeout(() => {
      console.log("[voice] Voice narration started");
      console.log(`[voice] Selected language: ${meta.label} (${effectiveLang})`);
      speak(clean, {
        lang: effectiveLang,
        onEnd: () => console.log("[voice] Voice narration completed"),
        onFallback: () => {
          console.warn("[voice] Falling back to English narration");
          toast.message(
            "Voice unavailable in the selected language. Playing English narration.",
          );
        },
        onError: (msg) => {
          console.warn("[voice] Voice narration unavailable:", msg);
          // Auto-narration may be blocked by the browser (no user gesture)
          // or the OS may lack a matching voice. Don't disrupt the user —
          // they can still tap the Listen button to play manually.
        },

      });
    }, 250);
    return () => window.clearTimeout(t);
  }, [lastAssistantId, loading, messages, advancedMultilingual, language]);

  const submit = async (raw: string) => {
    // Input validation: trim, reject empty, cap at 500 chars, collapse whitespace.
    const original = raw.replace(/\s+/g, " ").trim().slice(0, 500);
    if (!original || loading) return;

    // Lightweight client-side rate limit: 20 requests / 5 minutes per session.
    const now = Date.now();
    const WINDOW_MS = 5 * 60 * 1000;
    const LIMIT = 20;
    try {
      const raw = sessionStorage.getItem("assistant_rl") ?? "[]";
      const hits: number[] = JSON.parse(raw).filter(
        (t: number) => now - t < WINDOW_MS,
      );
      if (hits.length >= LIMIT) {
        toast.error("Please wait a moment before sending another request.");
        return;
      }
      hits.push(now);
      sessionStorage.setItem("assistant_rl", JSON.stringify(hits));
    } catch {
      /* ignore storage errors */
    }

    // Stop any in-progress narration immediately when a new query starts.
    cancelSpeech();
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
      const res = await ask({
        data: {
          query: original,
          citizenProfileId: profileId,
          targetLanguage: advancedMultilingual ? language : "en-IN",
        },
      });
      const reply: AssistantMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: res.answer,
        sources: res.sources,
        fallback: res.fallback,
        createdAt: new Date().toISOString(),
      };
      setMessages((m) => [...m, reply]);
      setLastAssistantId(reply.id);
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

        <div
          ref={scrollRef}
          className="flex-1 space-y-4 overflow-y-auto rounded-2xl border bg-card/60 p-4 shadow-sm sm:p-6"
        >
          {messages.length === 0 ? (
            <EmptyState onPick={(p) => void submit(p)} />
          ) : (
            messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
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
              // Auto-submit final transcript.
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
            maxLength={500}
            onChange={(e) => setInput(e.target.value.slice(0, 500))}
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

function EmptyState({ onPick }: { onPick: (prompt: string) => void }) {
  return (
    <div className="space-y-5 py-6 text-center sm:py-10">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <MessageCircle className="size-7" aria-hidden />
      </div>
      <div>
        <h2 className="text-lg font-semibold text-foreground">
          How can I help today?
        </h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
          Try one of these to get started.
        </p>
      </div>
      <div className="mx-auto grid max-w-xl gap-2 sm:grid-cols-2">
        {SUGGESTED_PROMPTS.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => onPick(p)}
            className="rounded-xl border bg-background px-4 py-3 text-left text-sm text-foreground transition hover:border-primary/40 hover:bg-accent"
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}

function MessageBubble({ message }: { message: AssistantMessage }) {
  const isUser = message.role === "user";
  return (
    <div
      className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}
    >
      <div
        className={cn(
          "max-w-[90%] rounded-2xl px-4 py-3 text-sm leading-relaxed",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-background text-foreground shadow-sm ring-1 ring-border",
        )}
      >
        {isUser ? (
          <p className="whitespace-pre-wrap">{message.content}</p>
        ) : (
          <>
            <div className="prose prose-sm max-w-none text-foreground prose-p:my-2 prose-ul:my-2 prose-headings:mt-3 prose-headings:mb-1 prose-strong:text-foreground">
              <ReactMarkdown>{message.content}</ReactMarkdown>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <ListenButton text={message.content} />
            </div>
            {message.fallback && (!message.sources || message.sources.length === 0) ? (
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
  const hasAnyLink = sources.some((s) => !!s.official_link);
  return (
    <div className="mt-3 rounded-xl border bg-accent/40 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
        <ShieldCheck className="size-3.5 text-primary" aria-hidden />
        Verified Sources
      </div>
      <ul className="mt-2 space-y-2">
        {sources.map((s) => (
          <li key={s.id} className="flex flex-col gap-1 text-xs">
            <div className="flex items-start gap-2">
              <Badge
                variant="secondary"
                className="mt-0.5 gap-1 px-1.5 py-0 text-[10px]"
              >
                <MapPin className="size-2.5" />
                {s.scheme_scope === "National" ? "National" : s.state}
              </Badge>
              <Link
                to="/schemes/$id"
                params={{ id: s.id }}
                className="min-w-0 flex-1 font-medium text-foreground hover:text-primary"
              >
                {s.scheme_name}
              </Link>
            </div>
            {s.official_link ? (
              <a
                href={s.official_link}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-1 inline-flex w-fit items-center gap-1 rounded-md border border-primary/30 bg-primary/5 px-2 py-1 text-[11px] font-medium text-primary hover:bg-primary/10"
              >
                <ExternalLink className="size-3" aria-hidden />
                Official Government Website
              </a>
            ) : (
              <p className="ml-1 text-[11px] text-muted-foreground">
                Official website currently unavailable for this scheme.
              </p>
            )}
          </li>
        ))}
      </ul>
      {!hasAnyLink ? (
        <p className="mt-2 text-[11px] text-muted-foreground">
          Verified information shown above. No official portal links are
          currently on file for these schemes.
        </p>
      ) : null}
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
