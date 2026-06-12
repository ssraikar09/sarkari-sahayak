import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  BarChart3,
  Database,
  Download,
  FileSpreadsheet,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RLegend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { getOutcomePredictionFn } from "@/lib/outcome-prediction/outcome.functions";
import { exportOutcomeReport } from "@/lib/outcome-prediction/reportExporter";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  HouseholdOutcome,
  OutcomePredictionSnapshot,
  ScenarioForecast,
  ScenarioId,
} from "@/lib/outcome-prediction/types";

export const Route = createFileRoute("/outcome-prediction")({
  head: () => ({
    meta: [
      { title: "Welfare Outcome Prediction Engine — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Forecast welfare opportunity score, annual benefits, and risk reduction under deterministic scenarios.",
      },
      {
        property: "og:title",
        content: "Welfare Outcome Prediction Engine — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Predict the impact of welfare interventions with explainable, evidence-backed forecasts.",
      },
    ],
  }),
  component: OutcomePredictionPage,
});

function OutcomePredictionPage() {
  const fn = useServerFn(getOutcomePredictionFn);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["outcome-prediction-snapshot"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="border-b bg-card/40 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw
                className={cn("mr-1 size-4", isFetching && "animate-spin")}
              />
              Refresh
            </Button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <Button
              size="sm"
              variant="outline"
              disabled={!data}
              onClick={() => data && exportOutcomeReport(data, "household")}
            >
              <FileSpreadsheet className="mr-1 size-4" />
              Household Forecast
            </Button>
            <Button
              size="sm"
              disabled={!data}
              onClick={() => data && exportOutcomeReport(data, "outcome")}
            >
              <Download className="mr-1 size-4" />
              Outcome Report
            </Button>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-8 sm:py-14">
        <Hero generatedAt={data?.generatedAt} />

        <div className="my-10 flex items-start gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-5 text-sm">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p className="text-muted-foreground">
            <span className="font-medium text-foreground">
              Deterministic forecasts.
            </span>{" "}
            Every prediction is derived from anonymized eligibility assessments,
            navigator logs, and the benefit-value estimator. Refreshing this
            page without new interactions returns identical numbers.
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} loading={isFetching} />
        ) : !data.hasSufficientData ? (
          <EmptyState />
        ) : (
          <Content snap={data} />
        )}
      </div>
    </main>
  );
}

function Hero({ generatedAt }: { generatedAt?: string }) {
  const updated = generatedAt
    ? new Date(generatedAt).toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      })
    : "—";
  return (
    <header className="relative overflow-hidden rounded-[2rem] border bg-gradient-to-br from-primary/10 via-card to-accent/30 p-8 sm:p-14">
      <div className="absolute -right-20 -top-20 size-72 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute -bottom-24 -left-12 size-64 rounded-full bg-accent/40 blur-3xl" />
      <div
        className="absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage:
            "linear-gradient(hsl(var(--foreground)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />
      <div className="relative">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/80 px-3.5 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5 text-primary" />
          Welfare Outcome Prediction Engine
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          What happens if citizens{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            act on what we recommend?
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A deterministic forecasting workspace — simulate uptake scenarios and
          measure the predicted lift in welfare scores, annual benefits, and
          household readiness.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live forecast
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Last updated: <span className="font-medium text-foreground">{updated}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" />
            Sources: Eligibility · Navigator · Guides · Benefit Estimator
          </span>
        </div>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-44 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function ErrorState({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load outcome predictions right now.
      </p>
      <Button className="mt-3" size="sm" onClick={onRetry} disabled={loading}>
        {loading ? "Retrying…" : "Try again"}
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <Lightbulb className="mx-auto size-10 text-primary" />
      <h2 className="mt-3 text-lg font-semibold">More data needed</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Run an eligibility check or open the Welfare Navigator for at least one
        household to unlock outcome predictions.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild size="sm">
          <Link to="/eligibility">Run an Eligibility Check</Link>
        </Button>
        <Button asChild size="sm" variant="outline">
          <Link to="/navigator">Open Welfare Navigator</Link>
        </Button>
      </div>
    </div>
  );
}

function Content({ snap }: { snap: OutcomePredictionSnapshot }) {
  return (
    <div className="space-y-20">
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Outcome Summary"
          title="Current state vs. predicted impact"
          description="Compare baseline welfare indicators against the full-uptake forecast."
        />
        <SummaryGrid snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Scenario Simulator"
          title="Simulate different uptake strategies"
          description="Each scenario is deterministic — same data in, same forecast out."
        />
        <ScenarioSimulator snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Outcome Forecasts"
          title="Lift across welfare indicators"
          description="Score, benefit, and readiness gains compared to baseline."
        />
        <ForecastCharts snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Explainability"
          title="Why these predictions"
          description="Every forecast is backed by an action chain and named evidence sources."
        />
        <Explainers snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Household Outcome Analysis"
          title="Individual & household predictions"
          description="Drill into per-household current and predicted indicators."
        />
        <HouseholdAnalysis snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Research Insights"
          title="Aggregate research view"
          description="Average lift and the highest-impact scheme categories nationally."
        />
        <Research snap={snap} />
      </section>
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description: string;
}) {
  return (
    <div className="flex flex-col gap-3">
      <div className="inline-flex w-fit items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
        <span className="size-1.5 rounded-full bg-primary" />
        {eyebrow}
      </div>
      <h2 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        {title}
      </h2>
      <p className="max-w-2xl text-sm text-muted-foreground sm:text-base">
        {description}
      </p>
    </div>
  );
}

// ============================================================
// Summary dashboard
// ============================================================
function SummaryGrid({ snap }: { snap: OutcomePredictionSnapshot }) {
  const s = snap.summary;
  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <ComparisonCard
        icon={<Gauge className="size-5" />}
        title="Welfare Opportunity Score"
        suffix="/100"
        current={s.currentAverageScore}
        predicted={s.predictedAverageScore}
        positiveIsUp
      />
      <ComparisonCard
        icon={<BarChart3 className="size-5" />}
        title="Estimated Annual Benefits"
        current={s.currentAverageBenefitsINR}
        predicted={s.predictedAverageBenefitsINR}
        format={formatINR}
        positiveIsUp
      />
      <ComparisonCard
        icon={<ShieldAlert className="size-5" />}
        title="High Welfare Risk"
        suffix="%"
        current={s.currentHighRiskPct}
        predicted={s.predictedHighRiskPct}
        positiveIsUp={false}
      />
    </div>
  );
}

function ComparisonCard({
  icon,
  title,
  suffix,
  current,
  predicted,
  format,
  positiveIsUp,
}: {
  icon: React.ReactNode;
  title: string;
  suffix?: string;
  current: number;
  predicted: number;
  format?: (n: number) => string;
  positiveIsUp: boolean;
}) {
  const delta = predicted - current;
  const improved = positiveIsUp ? delta > 0 : delta < 0;
  const fmt = (n: number) => (format ? format(n) : `${n}${suffix ?? ""}`);
  const arrow = improved ? "↑" : delta === 0 ? "•" : "↓";
  const tone = improved
    ? "text-emerald-600 bg-emerald-500/10 dark:text-emerald-400"
    : delta === 0
      ? "text-muted-foreground bg-muted"
      : "text-rose-600 bg-rose-500/10 dark:text-rose-400";

  return (
    <div className="relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card p-6 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl sm:p-7">
      <div className="flex items-start justify-between gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider",
            tone,
          )}
        >
          {arrow} {format ? formatINR(Math.abs(delta)) : `${Math.abs(delta)}${suffix ?? ""}`}
        </span>
      </div>
      <div className="mt-5 text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
        {title}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Current
          </div>
          <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
            {fmt(current)}
          </div>
        </div>
        <div className="border-l pl-4">
          <div className="text-[10px] font-bold uppercase tracking-wider text-primary">
            Predicted
          </div>
          <div className="mt-1 text-3xl font-bold leading-none tabular-nums text-primary md:text-4xl">
            {fmt(predicted)}
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// Scenario simulator
// ============================================================
function ScenarioSimulator({ snap }: { snap: OutcomePredictionSnapshot }) {
  const [selectedId, setSelectedId] = useState<ScenarioId>(
    snap.scenarios[0]?.id ?? "top3",
  );
  const selected = snap.scenarios.find((s) => s.id === selectedId);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {snap.scenarios.map((sc) => {
          const active = sc.id === selectedId;
          return (
            <button
              key={sc.id}
              type="button"
              onClick={() => setSelectedId(sc.id)}
              className={cn(
                "group relative flex h-full flex-col rounded-2xl border p-5 text-left shadow-sm transition-all",
                active
                  ? "border-primary bg-primary/5 ring-2 ring-primary/30"
                  : "bg-card hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md",
              )}
            >
              <div className="flex items-center justify-between">
                <span
                  className={cn(
                    "inline-flex size-9 items-center justify-center rounded-xl",
                    active
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary/10 text-primary",
                  )}
                >
                  <Target className="size-4" />
                </span>
                <Badge variant="secondary" className="text-[10px]">
                  +{sc.averageScoreLift} pts
                </Badge>
              </div>
              <div className="mt-4 text-sm font-semibold leading-tight">
                {sc.label}
              </div>
              <p className="mt-1.5 line-clamp-3 text-xs text-muted-foreground">
                {sc.description}
              </p>
              <div className="mt-3 flex items-center justify-between text-[11px] text-muted-foreground">
                <span>Avg benefit lift</span>
                <span className="font-mono font-medium text-emerald-600 dark:text-emerald-400">
                  +{formatINR(sc.averageBenefitLiftINR)}
                </span>
              </div>
            </button>
          );
        })}
      </div>

      {selected && <ScenarioDetail scenario={selected} snap={snap} />}
    </div>
  );
}

function ScenarioDetail({
  scenario,
  snap,
}: {
  scenario: ScenarioForecast;
  snap: OutcomePredictionSnapshot;
}) {
  const s = snap.summary;
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
      <div className="flex items-start justify-between gap-4">
        <div>
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-primary">
            Selected scenario
          </div>
          <h3 className="mt-1 text-xl font-bold tracking-tight sm:text-2xl">
            {scenario.label}
          </h3>
          <p className="mt-1.5 max-w-2xl text-sm text-muted-foreground">
            {scenario.description}
          </p>
        </div>
        <Badge className="shrink-0">
          {scenario.affectedHouseholds} household(s) affected
        </Badge>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat
          label="Predicted Avg Score"
          value={`${scenario.predictedAverageScore}/100`}
          delta={`+${scenario.averageScoreLift}`}
          baseline={`${s.currentAverageScore}/100`}
        />
        <MiniStat
          label="Predicted Avg Benefits"
          value={formatINR(scenario.predictedAverageBenefitsINR)}
          delta={`+${formatINR(scenario.averageBenefitLiftINR)}`}
          baseline={formatINR(s.currentAverageBenefitsINR)}
        />
        <MiniStat
          label="Missed Reduction"
          value={`${scenario.averageMissedReduction} / household`}
          delta="explored"
          baseline="schemes moved"
        />
        <MiniStat
          label="Readiness Lift"
          value={`${scenario.readinessLiftPct}%`}
          delta="out of high risk"
          baseline="households improved"
        />
      </div>

      <div className="mt-6 rounded-xl border border-dashed bg-muted/40 p-4">
        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
          Required actions
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {scenario.actions.map((a) => (
            <span
              key={a}
              className="inline-flex items-center gap-1.5 rounded-lg border bg-card px-3 py-1.5 text-xs text-foreground/80"
            >
              <ArrowUpRight className="size-3 text-primary" />
              {a}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  delta,
  baseline,
}: {
  label: string;
  value: string;
  delta: string;
  baseline: string;
}) {
  return (
    <div className="rounded-xl border bg-muted/30 p-4">
      <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-bold tabular-nums">{value}</div>
      <div className="mt-1.5 flex items-center justify-between text-[11px]">
        <span className="text-emerald-600 dark:text-emerald-400">{delta}</span>
        <span className="text-muted-foreground">{baseline}</span>
      </div>
    </div>
  );
}

// ============================================================
// Forecast charts
// ============================================================
function ForecastCharts({ snap }: { snap: OutcomePredictionSnapshot }) {
  const scoreData = snap.scenarios.map((s) => ({
    name: shortLabel(s.label),
    Current: snap.summary.currentAverageScore,
    Predicted: s.predictedAverageScore,
  }));
  const benefitData = snap.scenarios.map((s) => ({
    name: shortLabel(s.label),
    Lift: s.averageBenefitLiftINR,
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-3">
        <PanelCard
          title="Score lift by scenario"
          subtitle="Average Welfare Opportunity Score, current vs predicted."
          icon={<TrendingUp className="size-4" />}
        >
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={scoreData} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  interval={0}
                />
                <YAxis tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <RLegend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="Current" fill="hsl(var(--muted-foreground))" radius={[6, 6, 0, 0]} />
                <Bar dataKey="Predicted" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>
      <div className="lg:col-span-2">
        <PanelCard
          title="Annual benefit lift"
          subtitle="Average ₹ gained per household, per scenario."
          icon={<BarChart3 className="size-4" />}
        >
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={benefitData}
                layout="vertical"
                margin={{ top: 8, right: 16, left: 0, bottom: 8 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                <XAxis
                  type="number"
                  tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                  tickFormatter={(v) => formatINR(Number(v))}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  width={120}
                />
                <Tooltip
                  formatter={(v: number) => formatINR(v)}
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="Lift" fill="hsl(var(--primary))" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </PanelCard>
      </div>
    </div>
  );
}

// ============================================================
// Explainability
// ============================================================
function Explainers({ snap }: { snap: OutcomePredictionSnapshot }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {snap.explainers.map((e) => (
        <article
          key={e.id}
          className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl sm:p-8"
        >
          <span className="absolute left-0 top-0 h-full w-1.5 bg-primary" />
          <div className="flex items-start justify-between gap-4">
            <span className="inline-flex size-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Lightbulb className="size-5" />
            </span>
            <Badge variant="secondary" className="shrink-0 uppercase">
              Explainer
            </Badge>
          </div>
          <h3 className="mt-5 text-lg font-bold leading-snug tracking-tight sm:text-xl">
            {e.prediction}
          </h3>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            {e.rationale}
          </p>
          <div className="mt-5 space-y-2">
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
              Actions that drive this
            </div>
            <div className="flex flex-wrap gap-2">
              {e.actions.map((a) => (
                <span
                  key={a}
                  className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-foreground/80"
                >
                  <span className="size-1.5 rounded-full bg-primary" />
                  {a}
                </span>
              ))}
            </div>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t pt-4">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              Evidence
            </span>
            {e.sources.map((s) => (
              <span
                key={s}
                className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-medium text-foreground/70"
              >
                {s}
              </span>
            ))}
          </div>
        </article>
      ))}
    </div>
  );
}

// ============================================================
// Household outcome analysis
// ============================================================
function HouseholdAnalysis({ snap }: { snap: OutcomePredictionSnapshot }) {
  const [view, setView] = useState<"household" | "individual">("household");
  const [scenarioId, setScenarioId] = useState<ScenarioId>("all");

  const rows = useMemo(() => {
    const sorted = [...snap.households];
    sorted.sort((a, b) => {
      const ax = a.scenarios.find((s) => s.scenarioId === scenarioId)?.scoreDelta ?? 0;
      const bx = b.scenarios.find((s) => s.scenarioId === scenarioId)?.scoreDelta ?? 0;
      return bx - ax;
    });
    return sorted.slice(0, 25);
  }, [snap.households, scenarioId]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="inline-flex rounded-full border bg-card p-1">
          {(["household", "individual"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              className={cn(
                "rounded-full px-4 py-1.5 text-xs font-semibold capitalize transition-colors",
                view === v
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {v === "household" ? "Entire household" : "Individual citizen"}
            </button>
          ))}
        </div>
        <Select value={scenarioId} onValueChange={(v) => setScenarioId(v as ScenarioId)}>
          <SelectTrigger className="h-9 w-[220px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {snap.scenarios.map((s) => (
              <SelectItem key={s.id} value={s.id} className="text-xs">
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <PanelCard
        title={view === "household" ? "Household forecasts" : "Citizen-level forecasts"}
        subtitle={`Ranked by predicted score lift under the selected scenario. Showing top ${rows.length}.`}
        icon={<Users className="size-4" />}
      >
        <div className="overflow-x-auto -mx-2">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{view === "household" ? "Household" : "Citizen"}</TableHead>
                <TableHead>State</TableHead>
                <TableHead className="text-right">Eligible</TableHead>
                <TableHead className="text-right">Current Score</TableHead>
                <TableHead className="text-right">Predicted</TableHead>
                <TableHead className="text-right">Δ Benefits</TableHead>
                <TableHead>Risk Shift</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((h) => (
                <HouseholdRow key={h.snapshot.profileId} h={h} scenarioId={scenarioId} />
              ))}
            </TableBody>
          </Table>
        </div>
      </PanelCard>
    </div>
  );
}

function HouseholdRow({
  h,
  scenarioId,
}: {
  h: HouseholdOutcome;
  scenarioId: ScenarioId;
}) {
  const sc = h.scenarios.find((s) => s.scenarioId === scenarioId);
  if (!sc) return null;
  return (
    <TableRow>
      <TableCell className="font-medium">{h.snapshot.fullName}</TableCell>
      <TableCell className="text-muted-foreground">{h.snapshot.state}</TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {h.snapshot.eligibleCount}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums">
        {h.snapshot.currentScore}
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums font-semibold text-primary">
        {sc.predictedScore}
        <span className="ml-1 text-[10px] text-emerald-600 dark:text-emerald-400">
          (+{sc.scoreDelta})
        </span>
      </TableCell>
      <TableCell className="text-right font-mono tabular-nums text-emerald-600 dark:text-emerald-400">
        +{formatINR(sc.benefitsDeltaINR)}
      </TableCell>
      <TableCell>
        <RiskPill from={h.snapshot.currentRisk} to={sc.predictedRisk} />
      </TableCell>
    </TableRow>
  );
}

function RiskPill({ from, to }: { from: string; to: string }) {
  const tone = (t: string) =>
    t === "high"
      ? "bg-rose-500/10 text-rose-600 dark:text-rose-400"
      : t === "moderate"
        ? "bg-amber-500/10 text-amber-600 dark:text-amber-400"
        : "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400";
  return (
    <span className="inline-flex items-center gap-1.5 text-[11px]">
      <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", tone(from))}>
        {from}
      </span>
      <ArrowUpRight className="size-3 text-muted-foreground" />
      <span className={cn("rounded-full px-2 py-0.5 font-medium capitalize", tone(to))}>
        {to}
      </span>
    </span>
  );
}

// ============================================================
// Research insights
// ============================================================
function Research({ snap }: { snap: OutcomePredictionSnapshot }) {
  const r = snap.research;
  const pieData = r.mostImpactfulCategories.map((c, i) => ({
    name: c.category,
    value: c.predictedBenefitGainINR,
    color: PIE_COLORS[i % PIE_COLORS.length],
  }));

  return (
    <div className="grid gap-5 lg:grid-cols-5">
      <div className="lg:col-span-2 grid gap-5">
        <ResearchKpi
          icon={<TrendingUp className="size-5" />}
          label="Avg predicted benefit gain"
          value={formatINR(r.averagePredictedBenefitGainINR)}
          hint="Per household, if all eligible schemes are taken up."
          tone="emerald"
        />
        <ResearchKpi
          icon={<ShieldAlert className="size-5" />}
          label="Avg risk reduction"
          value={`${r.averagePredictedRiskReductionPct} pp`}
          hint="Drop in the share of high-risk households."
          tone="primary"
        />
      </div>

      <div className="lg:col-span-3">
        <PanelCard
          title="Most impactful scheme categories"
          subtitle="Predicted unrealized benefit pool by welfare category."
          icon={<Layers className="size-4" />}
        >
          {pieData.length === 0 ? (
            <Empty />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      innerRadius={60}
                      outerRadius={100}
                      paddingAngle={2}
                      dataKey="value"
                      stroke="none"
                    >
                      {pieData.map((d) => (
                        <Cell key={d.name} fill={d.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      formatter={(v: number) => formatINR(v)}
                      contentStyle={{
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        borderRadius: 8,
                        fontSize: 12,
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <ul className="space-y-3 self-center text-sm">
                {r.mostImpactfulCategories.map((c, i) => (
                  <li key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="flex min-w-0 items-center gap-2">
                        <span
                          className="inline-block size-2.5 shrink-0 rounded-sm"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                        <span className="truncate font-medium">{c.category}</span>
                      </span>
                      <span className="shrink-0 font-mono text-xs tabular-nums">
                        {formatINR(c.predictedBenefitGainINR)}
                      </span>
                    </div>
                    <Progress
                      value={Math.min(
                        100,
                        (c.predictedBenefitGainINR /
                          Math.max(
                            1,
                            r.mostImpactfulCategories[0].predictedBenefitGainINR,
                          )) *
                          100,
                      )}
                      className="h-1.5"
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </PanelCard>
      </div>
    </div>
  );
}

function ResearchKpi({
  icon,
  label,
  value,
  hint,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  hint: string;
  tone: "emerald" | "primary";
}) {
  const toneCls =
    tone === "emerald"
      ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400"
      : "bg-primary/10 text-primary";
  return (
    <div className="rounded-2xl border bg-card p-6 shadow-sm">
      <span className={cn("inline-flex size-11 items-center justify-center rounded-xl", toneCls)}>
        {icon}
      </span>
      <div className="mt-4 text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-3xl font-bold leading-none tabular-nums md:text-4xl">{value}</div>
      <p className="mt-2 text-xs text-muted-foreground">{hint}</p>
    </div>
  );
}

// ============================================================
// Reusable panel
// ============================================================
function PanelCard({
  title,
  subtitle,
  icon,
  children,
}: {
  title: string;
  subtitle?: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-shadow hover:shadow-md sm:p-6">
      <div className="mb-4 flex items-start gap-3">
        <span className="inline-flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
          {icon}
        </span>
        <div className="min-w-0">
          <h3 className="text-sm font-semibold leading-tight sm:text-base">
            {title}
          </h3>
          {subtitle && (
            <p className="mt-0.5 text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

function Empty() {
  return (
    <div className="flex h-24 items-center justify-center rounded-lg border border-dashed text-xs text-muted-foreground">
      No data yet.
    </div>
  );
}

const PIE_COLORS = [
  "hsl(221 83% 53%)",
  "hsl(160 84% 39%)",
  "hsl(38 92% 50%)",
  "hsl(280 65% 60%)",
  "hsl(0 84% 60%)",
  "hsl(190 90% 45%)",
];

function shortLabel(label: string): string {
  return label
    .replace("Apply to ", "")
    .replace("Complete ", "")
    .replace("Improve ", "");
}
