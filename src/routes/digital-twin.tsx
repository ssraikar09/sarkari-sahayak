import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Atom,
  Database,
  Download,
  FileSpreadsheet,
  Gauge,
  Info,
  Lightbulb,
  RefreshCw,
  RotateCcw,
  ShieldAlert,
  Sparkles,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend as RLegend,
  Line,
  LineChart,
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
import { Slider } from "@/components/ui/slider";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import { getDigitalTwinBaselineFn } from "@/lib/digital-twin/twin.functions";
import { runForecast } from "@/lib/digital-twin/forecastEngine";
import {
  buildAuditTrail,
  buildExplainers,
} from "@/lib/digital-twin/explainability";
import { generateNarrative } from "@/lib/digital-twin/summaryGenerator";
import {
  LEVERS,
  SCENARIO_PRESETS,
  ZERO_LEVERS,
} from "@/lib/digital-twin/presets";
import { exportDigitalTwinReport } from "@/lib/digital-twin/reportExporter";
import type {
  DigitalTwinReportKind,
} from "@/lib/digital-twin/reportExporter";
import type { DigitalTwinBaseline, LeverId, Levers } from "@/lib/digital-twin/types";

export const Route = createFileRoute("/digital-twin")({
  head: () => ({
    meta: [
      { title: "Welfare Digital Twin Simulator — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Simulate policy interventions on a deterministic digital twin of India's welfare delivery system.",
      },
      {
        property: "og:title",
        content: "Welfare Digital Twin Simulator — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Test welfare interventions with explainable, evidence-backed forecasts derived from existing analytics.",
      },
    ],
  }),
  component: DigitalTwinPage,
});

function DigitalTwinPage() {
  const fn = useServerFn(getDigitalTwinBaselineFn);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["digital-twin-baseline"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  const [levers, setLevers] = useState<Levers>({ ...ZERO_LEVERS });

  const forecast = useMemo(() => {
    if (!data) return null;
    return runForecast(data, levers);
  }, [data, levers]);

  const explainers = useMemo(
    () => (data && forecast ? buildExplainers(data, forecast) : []),
    [data, forecast],
  );
  const narrative = useMemo(
    () => (data && forecast ? generateNarrative(data, forecast) : ""),
    [data, forecast],
  );
  const audit = useMemo(() => buildAuditTrail(levers), [levers]);

  const setLever = (id: LeverId, v: number) =>
    setLevers((prev) => ({ ...prev, [id]: Math.max(0, Math.min(100, v)) }));

  const handleExport = (kind: DigitalTwinReportKind) => {
    if (data && forecast) exportDigitalTwinReport(data, forecast, kind);
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      <div className="sticky top-16 z-30 border-b bg-card/70 backdrop-blur">
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
              Refresh baseline
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLevers({ ...ZERO_LEVERS })}
            >
              <RotateCcw className="mr-1 size-4" />
              Reset levers
            </Button>
            <span className="hidden h-5 w-px bg-border sm:block" />
            <Button
              size="sm"
              variant="outline"
              disabled={!data}
              onClick={() => handleExport("evidence")}
            >
              <FileSpreadsheet className="mr-1 size-4" />
              Evidence
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data}
              onClick={() => handleExport("intervention")}
            >
              <FileSpreadsheet className="mr-1 size-4" />
              Intervention
            </Button>
            <Button
              size="sm"
              disabled={!data}
              onClick={() => handleExport("twin")}
            >
              <Download className="mr-1 size-4" />
              Digital Twin Report
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
              Deterministic digital twin.
            </span>{" "}
            Forecasts are computed from existing eligibility, navigator, CSC, and
            application-guide analytics using transparent formulas — no
            randomness, no external models. Refreshing this page without new
            interactions returns identical numbers.
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} loading={isFetching} />
        ) : !data.hasSufficientData ? (
          <EmptyState />
        ) : (
          <div className="space-y-16">
            <BaselineSection baseline={data} />
            <SimulatorSection
              levers={levers}
              onLever={setLever}
              onPreset={(p) => setLevers({ ...p })}
            />
            {forecast && (
              <>
                <ComparisonSection baseline={data} forecast={forecast} />
                <VisualizationSection forecast={forecast} />
                <ExplainabilitySection
                  explainers={explainers}
                  narrative={narrative}
                />
                <AuditSection audit={audit} generatedAt={data.generatedAt} />
              </>
            )}
          </div>
        )}
      </div>
    </main>
  );
}

/* ---------- Hero ---------- */
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
          <Atom className="size-3.5 text-primary" />
          Welfare Digital Twin Simulator
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          Simulate India's welfare delivery,{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            one lever at a time.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A research-grade digital twin — move intervention sliders, run preset
          scenarios, and watch projected outcomes for opportunity score, risk,
          and household benefits update deterministically.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live twin
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Last updated:{" "}
            <span className="font-medium text-foreground">{updated}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" />
            Sources: Eligibility · Navigator · CSC · Guides · Insights
          </span>
        </div>
      </div>
    </header>
  );
}

/* ---------- Baseline ---------- */
function BaselineSection({ baseline }: { baseline: DigitalTwinBaseline }) {
  const t = baseline.totals;
  const kpis: KpiProps[] = [
    {
      icon: Users,
      label: "Households analysed",
      value: t.households.toLocaleString("en-IN"),
      sub: "From eligibility assessments",
    },
    {
      icon: Gauge,
      label: "Avg opportunity score",
      value: `${t.averageOpportunityScore}/100`,
      sub: "Across all households",
      tone: t.averageOpportunityScore >= 60 ? "ok" : t.averageOpportunityScore >= 40 ? "warn" : "bad",
    },
    {
      icon: Target,
      label: "Avg missed opportunities",
      value: String(t.averageMissedOpportunities),
      sub: "Per household",
    },
    {
      icon: TrendingUp,
      label: "Avg annual benefits",
      value: formatINR(t.averageAnnualBenefitsINR),
      sub: "Currently realised",
    },
    {
      icon: ShieldAlert,
      label: "High-risk households",
      value: `${t.highRiskPct}%`,
      sub: "Score below 40",
      tone: t.highRiskPct <= 20 ? "ok" : t.highRiskPct <= 40 ? "warn" : "bad",
    },
    {
      icon: Sparkles,
      label: "Welfare readiness score",
      value: `${t.welfareReadinessScore}/100`,
      sub: "0.6 × score + 0.4 × (100 − risk)",
      tone: t.welfareReadinessScore >= 60 ? "ok" : t.welfareReadinessScore >= 40 ? "warn" : "bad",
    },
  ];
  return (
    <section>
      <SectionHeader
        eyebrow="Baseline snapshot"
        title="The current state of welfare delivery"
        subtitle="Aggregated from existing platform analytics — this is what the digital twin starts from before any intervention is applied."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {kpis.map((k) => (
          <Kpi key={k.label} {...k} />
        ))}
      </div>
    </section>
  );
}

/* ---------- Simulator ---------- */
function SimulatorSection({
  levers,
  onLever,
  onPreset,
}: {
  levers: Levers;
  onLever: (id: LeverId, v: number) => void;
  onPreset: (l: Levers) => void;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Intervention simulator"
        title="Move the levers, run the scenarios"
        subtitle="Each lever raises uptake of currently-missed schemes using a transparent weighted formula. Sliders range 0–100%."
      />

      <div className="mt-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <h3 className="text-sm font-semibold text-muted-foreground">
            Intervention levers
          </h3>
          <div className="mt-5 space-y-6">
            {LEVERS.map((meta) => (
              <div key={meta.id}>
                <div className="flex items-baseline justify-between gap-3">
                  <div>
                    <div className="text-sm font-semibold">{meta.label}</div>
                    <div className="text-xs text-muted-foreground">
                      {meta.description}
                    </div>
                  </div>
                  <div className="shrink-0 rounded-md bg-primary/10 px-2.5 py-1 text-sm font-semibold text-primary tabular-nums">
                    {levers[meta.id]}%
                  </div>
                </div>
                <Slider
                  className="mt-3"
                  value={[levers[meta.id]]}
                  min={0}
                  max={100}
                  step={5}
                  onValueChange={([v]) => onLever(meta.id, v ?? 0)}
                />
                <div className="mt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                  <span>Source: {meta.module}</span>
                  <span>Weight {meta.weight}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <h3 className="text-sm font-semibold text-muted-foreground">
            One-click scenarios
          </h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Apply a preset combination of lever settings.
          </p>
          <div className="mt-5 space-y-3">
            {SCENARIO_PRESETS.map((p) => (
              <button
                key={p.id}
                onClick={() => onPreset(p.levers)}
                className="group w-full rounded-xl border bg-background p-4 text-left transition hover:border-primary/40 hover:shadow-sm"
              >
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold group-hover:text-primary">
                    {p.label}
                  </div>
                  <Sparkles className="size-3.5 text-muted-foreground group-hover:text-primary" />
                </div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {p.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Comparison ---------- */
function ComparisonSection({
  baseline,
  forecast,
}: {
  baseline: DigitalTwinBaseline;
  forecast: ReturnType<typeof runForecast>;
}) {
  const rows = [
    {
      label: "Opportunity score",
      current: `${baseline.totals.averageOpportunityScore}/100`,
      sim: `${forecast.simulated.averageOpportunityScore}/100`,
      delta: `+${forecast.deltas.opportunityScore}`,
    },
    {
      label: "Annual benefits (avg)",
      current: formatINR(baseline.totals.averageAnnualBenefitsINR),
      sim: formatINR(forecast.simulated.averageAnnualBenefitsINR),
      delta: `+${formatINR(forecast.deltas.benefitGainINR)}`,
    },
    {
      label: "High-risk share",
      current: `${baseline.totals.highRiskPct}%`,
      sim: `${forecast.simulated.highRiskPct}%`,
      delta: `−${forecast.deltas.riskReductionPct} pp`,
    },
    {
      label: "Welfare readiness",
      current: `${baseline.totals.welfareReadinessScore}/100`,
      sim: `${forecast.simulated.welfareReadinessScore}/100`,
      delta: `+${forecast.deltas.readinessLift}`,
    },
    {
      label: "Navigator adoption",
      current: `${baseline.totals.navigatorAdoptionPct}%`,
      sim: `${forecast.simulated.navigatorAdoptionPct}%`,
      delta: `+${Math.max(0, forecast.simulated.navigatorAdoptionPct - baseline.totals.navigatorAdoptionPct)} pp`,
    },
    {
      label: "Scheme utilisation",
      current: `${baseline.totals.csCoverageProxyPct}%`,
      sim: `${forecast.simulated.csCoverageProxyPct}%`,
      delta: `+${Math.max(0, forecast.simulated.csCoverageProxyPct - baseline.totals.csCoverageProxyPct)} pp`,
    },
  ];

  return (
    <section>
      <SectionHeader
        eyebrow="Before vs after"
        title="Current state vs simulated state"
        subtitle="Every metric is recomputed deterministically from the same household base — only the intervention levers change."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Comparison table
          </div>
          <div className="overflow-hidden rounded-xl border">
            <table className="w-full text-sm">
              <thead className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 text-left font-medium">Metric</th>
                  <th className="px-4 py-2.5 text-right font-medium">Current</th>
                  <th className="px-4 py-2.5 text-right font-medium">Simulated</th>
                  <th className="px-4 py-2.5 text-right font-medium">Change</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.label} className="border-t">
                    <td className="px-4 py-2.5 font-medium">{r.label}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums text-muted-foreground">
                      {r.current}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold">
                      {r.sim}
                    </td>
                    <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-emerald-600">
                      {r.delta}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="rounded-2xl border bg-card p-6">
          <div className="mb-4 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Risk distribution shift
          </div>
          <div className="grid grid-cols-2 gap-4">
            <RiskDonut title="Current" data={forecast.currentRisk} />
            <RiskDonut title="Simulated" data={forecast.simulatedRisk} />
          </div>
        </div>
      </div>
    </section>
  );
}

function RiskDonut({
  title,
  data,
}: {
  title: string;
  data: { high: number; moderate: number; low: number };
}) {
  const rows = [
    { name: "High", value: data.high, color: "hsl(var(--destructive))" },
    { name: "Moderate", value: data.moderate, color: "#f59e0b" },
    { name: "Low", value: data.low, color: "#10b981" },
  ];
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="mb-2 text-xs font-medium text-muted-foreground">
        {title}
      </div>
      <div className="h-52">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={42}
              outerRadius={70}
              paddingAngle={2}
            >
              {rows.map((r, i) => (
                <Cell key={i} fill={r.color} />
              ))}
            </Pie>
            <Tooltip />
            <RLegend
              verticalAlign="bottom"
              height={20}
              wrapperStyle={{ fontSize: 11 }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- Visualization ---------- */
function VisualizationSection({
  forecast,
}: {
  forecast: ReturnType<typeof runForecast>;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Impact visualisation"
        title="Trajectory & contribution analytics"
        subtitle="Charts show how outcomes evolve as the selected levers scale from 0% to their current settings."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <ChartCard title="Opportunity score & readiness trajectory">
          <LineChart data={forecast.trajectory}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="step"
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
            />
            <YAxis fontSize={11} />
            <Tooltip />
            <RLegend wrapperStyle={{ fontSize: 11 }} />
            <Line
              type="monotone"
              dataKey="score"
              name="Opportunity score"
              stroke="hsl(var(--primary))"
              strokeWidth={2}
              dot={false}
            />
            <Line
              type="monotone"
              dataKey="readiness"
              name="Readiness"
              stroke="#10b981"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ChartCard>

        <ChartCard title="High welfare-risk reduction">
          <AreaChart data={forecast.trajectory}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="step"
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
            />
            <YAxis tickFormatter={(v) => `${v}%`} fontSize={11} />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Area
              type="monotone"
              dataKey="risk"
              name="High-risk %"
              stroke="hsl(var(--destructive))"
              fill="hsl(var(--destructive))"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Benefit gain projection (avg per household)">
          <AreaChart data={forecast.benefitProjection}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              dataKey="step"
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
            />
            <YAxis
              tickFormatter={(v) => `₹${(v / 1000).toFixed(0)}k`}
              fontSize={11}
            />
            <Tooltip formatter={(v: number) => formatINR(v)} />
            <Area
              type="monotone"
              dataKey="benefitINR"
              name="Annual benefits"
              stroke="hsl(var(--primary))"
              fill="hsl(var(--primary))"
              fillOpacity={0.2}
            />
          </AreaChart>
        </ChartCard>

        <ChartCard title="Intervention contribution breakdown">
          <BarChart data={forecast.contributions} layout="vertical">
            <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
            <XAxis
              type="number"
              tickFormatter={(v) => `${v}%`}
              fontSize={11}
            />
            <YAxis
              type="category"
              dataKey="label"
              width={100}
              fontSize={11}
            />
            <Tooltip formatter={(v: number) => `${v}%`} />
            <Bar
              dataKey="contributionPct"
              fill="hsl(var(--primary))"
              radius={[0, 6, 6, 0]}
            />
          </BarChart>
        </ChartCard>
      </div>
    </section>
  );
}

function ChartCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactElement;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <div className="mb-4 text-sm font-semibold">{title}</div>
      <div className="h-72">
        <ResponsiveContainer width="100%" height="100%">
          {children}
        </ResponsiveContainer>
      </div>
    </div>
  );
}

/* ---------- Explainability ---------- */
function ExplainabilitySection({
  explainers,
  narrative,
}: {
  explainers: ReturnType<typeof buildExplainers>;
  narrative: string;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Explainability layer"
        title="Why did this change?"
        subtitle="Every projected outcome is mapped back to the levers driving it and the source modules that supplied the evidence."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-accent/20 p-6 lg:col-span-1">
          <div className="inline-flex items-center gap-2 text-xs font-medium uppercase tracking-wider text-primary">
            <Lightbulb className="size-3.5" />
            Research summary
          </div>
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            {narrative}
          </p>
        </div>
        <div className="grid gap-4 lg:col-span-2">
          {explainers.map((e) => (
            <div
              key={e.id}
              className="rounded-2xl border bg-card p-5"
            >
              <div className="text-sm font-semibold">{e.headline}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {e.rationale}
              </div>
              {e.evidence.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-foreground/80">
                  {e.evidence.map((ev, i) => (
                    <li key={i} className="flex gap-2">
                      <span className="text-primary">•</span>
                      <span>{ev}</span>
                    </li>
                  ))}
                </ul>
              )}
              {e.sources.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {e.sources.map((s) => (
                    <Badge
                      key={s}
                      variant="outline"
                      className="text-[10px] font-normal"
                    >
                      {s}
                    </Badge>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ---------- Audit ---------- */
function AuditSection({
  audit,
  generatedAt,
}: {
  audit: ReturnType<typeof buildAuditTrail>;
  generatedAt: string;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Audit trail"
        title="Inputs, formulas, sources"
        subtitle="Every forecast carries its complete derivation so it can be reproduced and reviewed."
      />
      <div className="mt-8 grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border bg-card p-6">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Input assumptions
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {LEVERS.map((l) => (
              <li key={l.id} className="flex justify-between gap-3">
                <span className="text-muted-foreground">{l.short}</span>
                <span className="font-semibold tabular-nums">
                  {audit.inputs[l.id]}%
                </span>
              </li>
            ))}
          </ul>
          <div className="mt-4 border-t pt-3 text-xs text-muted-foreground">
            Baseline timestamp:{" "}
            <span className="font-medium text-foreground">
              {new Date(generatedAt).toLocaleString("en-IN")}
            </span>
          </div>
        </div>
        <div className="rounded-2xl border bg-card p-6 lg:col-span-2">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Formula transparency
          </div>
          <ul className="mt-3 space-y-3 text-sm">
            {audit.formulas.map((f) => (
              <li key={f.name}>
                <div className="font-semibold">{f.name}</div>
                <code className="mt-1 inline-block rounded bg-muted px-2 py-1 text-xs">
                  {f.formula}
                </code>
              </li>
            ))}
          </ul>
          <div className="mt-5">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Source datasets
            </div>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {audit.sources.map((s) => (
                <Badge key={s} variant="secondary" className="text-[10px]">
                  {s}
                </Badge>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/* ---------- Utility components ---------- */
type Tone = "ok" | "warn" | "bad" | "default";
type KpiProps = {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  sub?: string;
  tone?: Tone;
};
function Kpi({ icon: Icon, label, value, sub, tone = "default" }: KpiProps) {
  const ring =
    tone === "ok"
      ? "ring-emerald-500/20 bg-emerald-500/5"
      : tone === "warn"
        ? "ring-amber-500/20 bg-amber-500/5"
        : tone === "bad"
          ? "ring-rose-500/20 bg-rose-500/5"
          : "ring-border bg-card";
  const iconTone =
    tone === "ok"
      ? "text-emerald-600"
      : tone === "warn"
        ? "text-amber-600"
        : tone === "bad"
          ? "text-rose-600"
          : "text-primary";
  return (
    <div className={cn("rounded-2xl border p-5 ring-1 transition-all hover:-translate-y-0.5 hover:shadow-md", ring)}>
      <div className="flex items-center justify-between">
        <div className={cn("rounded-lg bg-background p-2", iconTone)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className="mt-4 text-2xl font-semibold leading-none tabular-nums">{value}</div>
      <div className="mt-1 text-xs font-medium text-foreground/80">{label}</div>
      {sub && (
        <div className="mt-0.5 text-[11px] text-muted-foreground">{sub}</div>
      )}
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="max-w-3xl">
      <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-4 text-2xl font-bold tracking-tight sm:text-3xl">
        {title}
      </h2>
      {subtitle && (
        <p className="mt-2 text-sm text-muted-foreground sm:text-base">
          {subtitle}
        </p>
      )}
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-2xl" />
      ))}
    </div>
  );
}

function ErrorState({
  onRetry,
  loading,
}: {
  onRetry: () => void;
  loading: boolean;
}) {
  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/5 p-10 text-center">
      <h3 className="text-lg font-semibold">Unable to load digital twin</h3>
      <p className="mt-1 text-sm text-muted-foreground">
        We couldn't fetch baseline analytics. Try refreshing.
      </p>
      <Button className="mt-4" onClick={onRetry} disabled={loading}>
        <RefreshCw className={cn("mr-1 size-4", loading && "animate-spin")} />
        Retry
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-card/40 p-10 text-center">
      <h3 className="text-lg font-semibold">Not enough data yet</h3>
      <p className="mt-2 text-sm text-muted-foreground">
        The Digital Twin needs at least one eligibility assessment to project
        outcomes. Onboard a household to begin.
      </p>
    </div>
  );
}
