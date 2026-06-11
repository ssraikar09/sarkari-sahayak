import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowLeft, Search, X } from "lucide-react";
import { SchemeCard } from "@/components/schemes/SchemeCard";
import {
  SCHEME_CATEGORIES,
  SCHEME_STATES,
  SchemeFallback,
  listSchemes,
  logUnsuccessfulSearch,
  type GovernmentScheme,
  type SchemeScope,
} from "@/lib/schemes";
import { cn } from "@/lib/utils";

const ALL = "__all__";

export const Route = createFileRoute("/schemes")({
  head: () => ({
    meta: [
      { title: "Scheme Explorer — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Browse and search government schemes across India's top 5 states by category and eligibility.",
      },
      { property: "og:title", content: "Scheme Explorer — Sarkari Sahayak X" },
      {
        property: "og:description",
        content: "Discover central and state government schemes you may be eligible for.",
      },
    ],
  }),
  component: SchemeExplorer,
});

type ScopeOption = "All" | SchemeScope;
const SCOPE_OPTIONS: ScopeOption[] = ["All", "National", "State"];

function SchemeExplorer() {
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [scope, setScope] = useState<ScopeOption>("All");
  const [state, setState] = useState<string>(ALL);
  const [category, setCategory] = useState<string>(ALL);
  const [schemes, setSchemes] = useState<GovernmentScheme[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search), 250);
    return () => clearTimeout(t);
  }, [search]);

  // When viewing National only, clear the state-specific filter
  useEffect(() => {
    if (scope === "National" && state !== ALL) setState(ALL);
  }, [scope, state]);

  useEffect(() => {
    let active = true;
    setSchemes(null);
    setError(null);
    listSchemes({
      search: debounced || undefined,
      state: state === ALL ? undefined : state,
      category: category === ALL ? undefined : category,
      scope: scope === "All" ? undefined : scope,
    })
      .then((rows) => {
        if (active) setSchemes(rows);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError("Couldn't load schemes. Please try again.");
      });
    return () => {
      active = false;
    };
  }, [debounced, state, category, scope]);

  const hasFilters = useMemo(
    () => Boolean(search || state !== ALL || category !== ALL || scope !== "All"),
    [search, state, category, scope],
  );

  const clearFilters = () => {
    setSearch("");
    setState(ALL);
    setCategory(ALL);
    setScope("All");
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-6xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
        </div>

        <header className="mb-8 text-center sm:text-left">
          <h1 className="text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Scheme Explorer
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Discover government schemes from {SCHEME_STATES.length} pilot states across{" "}
            {SCHEME_CATEGORIES.length} citizen categories.
          </p>
        </header>

        <div className="sticky top-2 z-10 space-y-3 rounded-2xl border bg-card/95 p-4 shadow-sm backdrop-blur">
          <div
            role="tablist"
            aria-label="Filter by scheme scope"
            className="inline-flex rounded-lg bg-muted p-1"
          >
            {SCOPE_OPTIONS.map((opt) => {
              const active = scope === opt;
              return (
                <button
                  key={opt}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setScope(opt)}
                  className={cn(
                    "rounded-md px-4 py-1.5 text-sm font-medium transition",
                    active
                      ? "bg-card text-foreground shadow-sm"
                      : "text-muted-foreground hover:text-foreground",
                  )}
                >
                  {opt}
                </button>
              );
            })}
          </div>

          <div className="grid gap-3 sm:grid-cols-[1fr_180px_180px_auto]">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search schemes…"
                className="h-11 pl-9 text-base"
                aria-label="Search schemes"
              />
            </div>
            <Select
              value={state}
              onValueChange={setState}
              disabled={scope === "National"}
            >
              <SelectTrigger className="h-11" aria-label="Filter by state">
                <SelectValue placeholder="All states" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All states</SelectItem>
                {SCHEME_STATES.map((s) => (
                  <SelectItem key={s} value={s}>
                    {s}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={category} onValueChange={setCategory}>
              <SelectTrigger className="h-11" aria-label="Filter by category">
                <SelectValue placeholder="All categories" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>All categories</SelectItem>
                {SCHEME_CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              variant="outline"
              className="h-11"
              onClick={clearFilters}
              disabled={!hasFilters}
            >
              <X className="mr-1 size-4" />
              Clear
            </Button>
          </div>
        </div>

        <div className="mt-6">
          {error ? (
            <EmptyState
              title="Something went wrong"
              message={error}
              action={
                <Button onClick={() => setDebounced((d) => d + "")}>Retry</Button>
              }
            />
          ) : schemes === null ? (
            <SchemesGrid>
              {Array.from({ length: 6 }).map((_, i) => (
                <Skeleton key={i} className="h-52 w-full rounded-2xl" />
              ))}
            </SchemesGrid>
          ) : schemes.length === 0 ? (
            <EmptyState
              title="No schemes match your filters"
              message="Try a different search term or clear the filters to see all schemes."
              action={
                hasFilters ? (
                  <Button onClick={clearFilters} variant="outline">
                    Clear filters
                  </Button>
                ) : null
              }
            />
          ) : (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Showing {schemes.length} scheme{schemes.length === 1 ? "" : "s"}
              </p>
              <SchemesGrid>
                {schemes.map((s) => (
                  <SchemeCard key={s.id} scheme={s} />
                ))}
              </SchemesGrid>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

function SchemesGrid({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
  );
}

function EmptyState({
  title,
  message,
  action,
}: {
  title: string;
  message: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">{message}</p>
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
