import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CalendarClock,
  CheckCircle2,
  Circle,
  Clock,
  Download,
  ExternalLink,
  FileText,
  MapPin,
  Search,
  Sparkles,
  Tag,
} from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import { getStoredProfileId } from "@/lib/citizen-profile/storage";
import {
  downloadSummary,
  fetchGuidance,
  loadChecklistState,
  logGuidanceAccessFn,
  saveChecklistState,
  type SchemeGuidance,
} from "@/lib/application-guide";

const searchSchema = z.object({
  schemeId: z.string().uuid().optional(),
});

export const Route = createFileRoute("/application-guide")({
  validateSearch: (s) => searchSchema.parse(s),
  head: () => ({
    meta: [
      { title: "Application Guide — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Step-by-step guidance for applying to government welfare schemes — documents checklist, official links, and downloadable summary.",
      },
      {
        property: "og:title",
        content: "Application Guide — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Move from discovery to action with structured application guidance for every recommended scheme.",
      },
    ],
  }),
  component: ApplicationGuidePage,
});

function ApplicationGuidePage() {
  const navigate = useNavigate();
  const { schemeId } = Route.useSearch();
  const logAccess = useServerFn(logGuidanceAccessFn);

  const [guidance, setGuidance] = useState<SchemeGuidance | null>(null);
  const [loading, setLoading] = useState<boolean>(Boolean(schemeId));
  const [error, setError] = useState<string | null>(null);
  const [checked, setChecked] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let active = true;
    if (!schemeId) {
      setGuidance(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const g = await fetchGuidance(schemeId);
        if (!active) return;
        if (!g) {
          setError("We couldn't find this scheme.");
          setGuidance(null);
          return;
        }
        setGuidance(g);
        setChecked(loadChecklistState(schemeId));
        const profileId = getStoredProfileId();
        void logAccess({ data: { schemeId, citizenProfileId: profileId } });
      } catch (e) {
        console.error(e);
        if (active) setError("Couldn't load the application guidance.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [schemeId, logAccess]);

  const toggle = (id: string) => {
    if (!schemeId) return;
    setChecked((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveChecklistState(schemeId, next);
      return next;
    });
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-4xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Module 6 · Application Guide
          </Badge>
        </div>

        <header className="mb-6 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Application Guide
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            From discovery to action — search a scheme or open one from your
            eligibility list to get a step-by-step application plan.
          </p>
        </header>

        {!schemeId ? (
          <SchemeSearchPanel
            onPick={(id) => navigate({ to: "/application-guide", search: { schemeId: id } })}
          />
        ) : loading ? (
          <div className="space-y-4">
            <Skeleton className="h-32 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
            <Skeleton className="h-64 w-full rounded-2xl" />
          </div>
        ) : error ? (
          <NotFoundState message={error} />
        ) : guidance ? (
          <GuidanceView
            guidance={guidance}
            checked={checked}
            onToggle={toggle}
          />
        ) : null}
      </div>
    </main>
  );
}

/* ---------- Search panel ---------- */

function SchemeSearchPanel({ onPick }: { onPick: (id: string) => void }) {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState<GovernmentScheme[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    let active = true;
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const list = await listSchemes(term.trim() ? { search: term } : {});
        if (active) setResults(list.slice(0, 30));
      } catch (e) {
        console.error(e);
      } finally {
        if (active) setLoading(false);
      }
    }, 250);
    return () => {
      active = false;
      clearTimeout(t);
    };
  }, [term]);

  return (
    <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
      <label htmlFor="scheme-search" className="text-sm font-semibold text-foreground">
        Find a scheme to apply for
      </label>
      <div className="relative mt-2">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          id="scheme-search"
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          placeholder="Search by scheme name or keyword"
          className="pl-9"
          autoFocus
        />
      </div>

      {loading ? (
        <div className="mt-4 space-y-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-14 w-full rounded-xl" />
          ))}
        </div>
      ) : results.length === 0 ? (
        <p className="mt-4 text-sm text-muted-foreground">No schemes found.</p>
      ) : (
        <ul className="mt-4 divide-y rounded-xl border bg-background/40">
          {results.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onPick(s.id)}
                className="flex w-full items-start gap-3 p-3 text-left transition hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-foreground">
                    {s.scheme_name}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">
                    {s.category} · {s.scheme_scope}
                    {s.scheme_scope === "State" ? ` · ${s.state}` : ""}
                  </p>
                </div>
                <Badge variant="secondary" className="shrink-0">
                  Open guide
                </Badge>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------- Guidance view ---------- */

function GuidanceView({
  guidance,
  checked,
  onToggle,
}: {
  guidance: SchemeGuidance;
  checked: Record<string, boolean>;
  onToggle: (id: string) => void;
}) {
  const s = guidance.scheme;
  const isNational = s.scheme_scope === "National";
  const completedCount = useMemo(
    () => guidance.documents.filter((d) => checked[d.id]).length,
    [guidance.documents, checked],
  );

  return (
    <div className="space-y-6">
      {/* Overview */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex flex-wrap items-center gap-2">
          <Badge
            className={cn(
              "gap-1",
              isNational
                ? "bg-primary text-primary-foreground hover:bg-primary/90"
                : "bg-accent text-accent-foreground hover:bg-accent/80",
            )}
          >
            <MapPin className="size-3" />
            {isNational ? "National" : `State · ${s.state}`}
          </Badge>
          <Badge variant="secondary" className="gap-1">
            <Tag className="size-3" />
            {s.category}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <Clock className="size-3" />
            {guidance.mode}
          </Badge>
        </div>

        <h2 className="mt-3 text-2xl font-bold text-foreground">
          {s.scheme_name}
        </h2>
        <p className="mt-2 text-sm text-muted-foreground">{s.description}</p>

        <div className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
          <InfoTile
            icon={<Clock className="size-4" />}
            label="Processing time"
            value={guidance.estimatedProcessingTime}
          />
          <InfoTile
            icon={<CalendarClock className="size-4" />}
            label="Last updated"
            value={new Date(guidance.lastUpdated).toLocaleDateString()}
          />
          <InfoTile
            icon={<FileText className="size-4" />}
            label="Documents"
            value={`${guidance.documents.length} required`}
          />
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button onClick={() => downloadSummary(guidance)}>
            <Download className="mr-1 size-4" />
            Download Application Summary
          </Button>
          {guidance.officialSchemeLink ? (
            <Button asChild variant="outline">
              <a
                href={guidance.officialSchemeLink}
                target="_blank"
                rel="noopener noreferrer"
              >
                <ExternalLink className="mr-1 size-4" />
                Official Scheme Link
              </a>
            </Button>
          ) : null}
          <Button asChild variant="ghost">
            <Link to="/schemes/$id" params={{ id: s.id }}>
              View full scheme details
            </Link>
          </Button>
        </div>

        {!guidance.hasDetailedGuidance ? (
          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
            Detailed application guidance is currently unavailable. Please
            refer to the official scheme portal.
          </div>
        ) : null}
      </section>

      {/* Timeline */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <h3 className="text-lg font-semibold text-foreground">
          Step-by-step timeline
        </h3>
        <ol className="mt-4 space-y-4">
          {guidance.steps.map((step, idx) => (
            <li key={step.index} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div className="flex size-8 items-center justify-center rounded-full bg-primary text-sm font-semibold text-primary-foreground">
                  {step.index}
                </div>
                {idx < guidance.steps.length - 1 ? (
                  <div className="mt-1 w-px flex-1 bg-border" aria-hidden />
                ) : null}
              </div>
              <div className="pb-4">
                <p className="font-medium text-foreground">{step.title}</p>
                {step.detail ? (
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.detail}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ol>
      </section>

      {/* Checklist */}
      <section className="rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-foreground">
            Documents checklist
          </h3>
          {guidance.documents.length > 0 ? (
            <Badge variant="secondary">
              {completedCount}/{guidance.documents.length} ready
            </Badge>
          ) : null}
        </div>

        {guidance.documents.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">
            No structured document list is available. Please refer to the
            official portal for the latest requirements.
          </p>
        ) : (
          <ul className="mt-3 divide-y">
            {guidance.documents.map((d) => {
              const isOn = !!checked[d.id];
              return (
                <li key={d.id}>
                  <button
                    type="button"
                    onClick={() => onToggle(d.id)}
                    aria-pressed={isOn}
                    className="flex w-full items-center gap-3 py-3 text-left transition hover:bg-accent/40"
                  >
                    {isOn ? (
                      <CheckCircle2 className="size-5 shrink-0 text-emerald-600" />
                    ) : (
                      <Circle className="size-5 shrink-0 text-muted-foreground" />
                    )}
                    <span
                      className={cn(
                        "text-sm",
                        isOn
                          ? "text-muted-foreground line-through"
                          : "text-foreground",
                      )}
                    >
                      {d.label}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function InfoTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-semibold text-foreground">{value}</p>
    </div>
  );
}

function NotFoundState({ message }: { message: string }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">
        Detailed application guidance is currently unavailable
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        {message} Please refer to the official scheme portal for the latest
        information.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-3">
        <Button asChild>
          <Link to="/application-guide" search={{ schemeId: undefined }}>
            Search another scheme
          </Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href="https://www.myscheme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 size-4" />
            Official Portal
          </a>
        </Button>
      </div>
    </div>
  );
}
