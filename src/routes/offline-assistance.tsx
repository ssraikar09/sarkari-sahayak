import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Database,
  WifiOff,
  CheckCircle2,
  AlertTriangle,
  Download,
  FileText,
  ClipboardList,
  Workflow,
  Info,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";

import {
  loadCache,
  runSync,
  runOfflineEligibility,
  exportEligibilitySummary,
  exportApplicationReport,
  exportInterventionSummary,
  type OfflineCache,
  type OfflineEligibilityInput,
  type OfflineEligibilityResult,
  type SyncProgress,
} from "@/lib/offline-assistance";
import {
  STATES,
  OCCUPATIONS,
  INCOME_BRACKETS,
} from "@/lib/citizen-profile/constants";

export const Route = createFileRoute("/offline-assistance")({
  head: () => ({
    meta: [
      { title: "Offline CSC Assistance — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Offline-ready welfare assistance for CSC operators in low-connectivity environments.",
      },
    ],
  }),
  component: OfflineAssistancePage,
});

function formatTime(iso: string | null): string {
  if (!iso) return "Never";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function OfflineAssistancePage() {
  const [cache, setCache] = useState<OfflineCache>(() => loadCache());
  const [syncing, setSyncing] = useState(false);
  const [progress, setProgress] = useState<SyncProgress | null>(null);
  const [online, setOnline] = useState<boolean>(
    typeof navigator !== "undefined" ? navigator.onLine : true,
  );

  useEffect(() => {
    const onOnline = () => setOnline(true);
    const onOffline = () => setOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
  }, []);

  const handleSync = async () => {
    setSyncing(true);
    setProgress({ step: "schemes", percent: 5, message: "Starting sync…" });
    const res = await runSync((p) => setProgress(p));
    setCache(res.cache);
    setSyncing(false);
  };

  // Offline eligibility form
  const [input, setInput] = useState<OfflineEligibilityInput>({
    state: STATES[0],
    occupation: OCCUPATIONS[0],
    age: 30,
    annual_income: INCOME_BRACKETS[0],
    disability_status: false,
  });
  const [result, setResult] = useState<OfflineEligibilityResult | null>(null);

  const cachedCount = cache.schemes.length;
  const lastSync = cache.lastSyncedAt;

  const runEligibility = () => {
    setResult(runOfflineEligibility(cache.schemes, input));
  };

  const statusColor = useMemo(() => {
    if (cache.lastSyncStatus === "success") return "text-emerald-600";
    if (cache.lastSyncStatus === "failed") return "text-rose-600";
    return "text-muted-foreground";
  }, [cache.lastSyncStatus]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
      <div className="mb-6 flex items-center justify-between gap-3">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-4" /> Home
        </Link>
        <Badge
          variant="outline"
          className={cn(
            "gap-1.5",
            online ? "border-emerald-500/40 text-emerald-600" : "border-amber-500/40 text-amber-600",
          )}
        >
          <WifiOff className="size-3.5" />
          {online ? "Network available" : "Offline mode"}
        </Badge>
      </div>

      <header className="mb-8">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-primary">
          <Database className="size-4" />
          Module 22 · Offline CSC Assistance
        </div>
        <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
          Offline Assistance Engine
        </h1>
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
          Cache schemes, application guides and intervention plans for CSC operators working in
          low-connectivity environments. All offline insights are generated using locally
          synchronized welfare datasets.
        </p>
      </header>

      {/* Readiness Dashboard */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <ReadinessCard
          label="Cached schemes"
          value={cachedCount}
          icon={<FileText className="size-4" />}
        />
        <ReadinessCard
          label="Application guides"
          value={cache.guides.length}
          icon={<ClipboardList className="size-4" />}
        />
        <ReadinessCard
          label="Intervention plans"
          value={cache.interventions.length}
          icon={<Workflow className="size-4" />}
        />
        <div className="rounded-xl border border-border/60 bg-card p-4">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
            <span>Last synchronization</span>
            {cache.lastSyncStatus === "success" ? (
              <CheckCircle2 className="size-4 text-emerald-600" />
            ) : cache.lastSyncStatus === "failed" ? (
              <AlertTriangle className="size-4 text-rose-600" />
            ) : (
              <Info className="size-4 text-muted-foreground" />
            )}
          </div>
          <div className="mt-2 text-base font-semibold">{formatTime(lastSync)}</div>
          <div className={cn("mt-1 text-xs", statusColor)}>
            {cache.lastSyncMessage ?? "No sync yet."}
          </div>
        </div>
      </section>

      {/* Sync Center */}
      <section className="mt-6 rounded-xl border border-border/60 bg-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold">Synchronization Center</h2>
            <p className="text-xs text-muted-foreground">
              Manual sync downloads the latest scheme catalogue, regenerates offline guides and
              caches intervention summaries.
            </p>
          </div>
          <Button onClick={handleSync} disabled={syncing} className="gap-2">
            <RefreshCw className={cn("size-4", syncing && "animate-spin")} />
            {syncing ? "Syncing…" : "Sync now"}
          </Button>
        </div>
        {progress && (
          <div className="mt-4">
            <Progress value={progress.percent} />
            <div className="mt-1 text-xs text-muted-foreground">{progress.message}</div>
          </div>
        )}
      </section>

      {/* Offline Eligibility Mode */}
      <section className="mt-6 grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <h2 className="text-base font-semibold">Offline Eligibility Mode</h2>
          <p className="text-xs text-muted-foreground">
            Run a basic eligibility check using locally available scheme data.
          </p>

          <div className="mt-4 grid gap-3">
            <div>
              <Label>State</Label>
              <Select
                value={input.state}
                onValueChange={(v) => setInput((s) => ({ ...s, state: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Occupation</Label>
              <Select
                value={input.occupation}
                onValueChange={(v) => setInput((s) => ({ ...s, occupation: v }))}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Age</Label>
                <Input
                  type="number"
                  min={0}
                  max={120}
                  value={input.age}
                  onChange={(e) => setInput((s) => ({ ...s, age: Number(e.target.value) || 0 }))}
                />
              </div>
              <div>
                <Label>Annual income</Label>
                <Select
                  value={input.annual_income}
                  onValueChange={(v) => setInput((s) => ({ ...s, annual_income: v }))}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {INCOME_BRACKETS.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={input.disability_status}
                onCheckedChange={(v) =>
                  setInput((s) => ({ ...s, disability_status: Boolean(v) }))
                }
              />
              Disability status
            </label>
            <Button
              onClick={runEligibility}
              disabled={cachedCount === 0}
              variant="secondary"
            >
              Run offline check
            </Button>
            {cachedCount === 0 && (
              <p className="text-xs text-amber-600">
                No cached data yet. Sync at least once to enable offline eligibility checks.
              </p>
            )}
          </div>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Results</h2>
            {result && (
              <Button
                size="sm"
                variant="outline"
                className="gap-1.5"
                onClick={() => exportEligibilitySummary(result)}
              >
                <Download className="size-3.5" /> Print / Save PDF
              </Button>
            )}
          </div>
          {!result ? (
            <p className="mt-4 text-sm text-muted-foreground">
              Run an offline check to see matching schemes from the local cache.
            </p>
          ) : (
            <div className="mt-4 space-y-3">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700 dark:text-amber-400">
                <strong>Offline Estimate</strong> — {result.disclaimer}
              </div>
              {result.matches.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No matches found in {result.basedOnCachedSchemes} cached schemes.
                </p>
              ) : (
                result.matches.slice(0, 12).map((m) => (
                  <div
                    key={m.schemeId}
                    className="rounded-lg border border-border/60 p-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <div className="text-sm font-semibold">{m.schemeName}</div>
                      <Badge variant="outline">{m.scope}</Badge>
                      <Badge variant="secondary">{m.category}</Badge>
                      <Badge
                        className={cn(
                          m.confidence === "high"
                            ? "bg-emerald-500/15 text-emerald-700"
                            : m.confidence === "medium"
                              ? "bg-amber-500/15 text-amber-700"
                              : "bg-slate-500/15 text-slate-700",
                        )}
                      >
                        {m.confidence} confidence
                      </Badge>
                    </div>
                    <ul className="mt-2 list-disc pl-5 text-xs text-muted-foreground">
                      {m.matchedSignals.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                ))
              )}
              <p className="text-[11px] italic text-muted-foreground">
                Generated using locally synchronized welfare datasets.
              </p>
            </div>
          )}
        </div>
      </section>

      {/* Cached Guides + Interventions */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Cached application guides</h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={cache.guides.length === 0}
              onClick={() => exportApplicationReport(cache.guides)}
            >
              <Download className="size-3.5" /> Export
            </Button>
          </div>
          {cache.guides.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No guides cached yet. Sync to enable offline guidance.
            </p>
          ) : (
            <ul className="mt-3 max-h-80 space-y-2 overflow-y-auto pr-1 text-sm">
              {cache.guides.slice(0, 30).map((g) => (
                <li
                  key={g.schemeId}
                  className="rounded-lg border border-border/60 p-2.5"
                >
                  <div className="font-medium">{g.schemeName}</div>
                  <div className="text-xs text-muted-foreground">
                    {g.documents.length} document(s) · {g.steps.length} step(s) · mode: {g.mode}
                  </div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] italic text-muted-foreground">
            Generated using locally synchronized welfare datasets.
          </p>
        </div>

        <div className="rounded-xl border border-border/60 bg-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold">Cached intervention plans</h2>
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={cache.interventions.length === 0}
              onClick={() => exportInterventionSummary(cache, cache.interventions)}
            >
              <Download className="size-3.5" /> Export
            </Button>
          </div>
          {cache.interventions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No intervention summaries cached. Sync to refresh.
            </p>
          ) : (
            <ul className="mt-3 space-y-2 text-sm">
              {cache.interventions.map((i) => (
                <li
                  key={i.id}
                  className="rounded-lg border border-border/60 p-2.5"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <div className="font-medium">{i.title}</div>
                    <Badge variant="outline">priority: {i.priority}</Badge>
                    <Badge variant="secondary">impact {i.impactScore}</Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{i.rationale}</div>
                </li>
              ))}
            </ul>
          )}
          <p className="mt-3 text-[11px] italic text-muted-foreground">
            Generated using locally synchronized welfare datasets.
          </p>
        </div>
      </section>
    </div>
  );
}

function ReadinessCard({
  label,
  value,
  icon,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border/60 bg-card p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground">
        <span>{label}</span>
        <span className="text-primary">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">available offline</div>
    </div>
  );
}
