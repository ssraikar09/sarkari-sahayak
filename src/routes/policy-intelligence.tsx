import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Activity,
  BarChart3,
  Building2,
  Database,
  Download,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Target,
  TrendingDown,
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
import { getPolicyIntelligenceFn } from "@/lib/policy-intelligence/insightEngine.functions";
import { exportPolicyReport } from "@/lib/policy-intelligence/reportExporter";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  PolicyIntelligenceSnapshot,
  StateRiskRow,
} from "@/lib/policy-intelligence/types";

export const Route = createFileRoute("/policy-intelligence")({
  head: () => ({
    meta: [
      { title: "Policy Intelligence Engine — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Identify welfare delivery gaps, generate explainable policy recommendations, and support evidence-based decision making.",
      },
      {
        property: "og:title",
        content: "Policy Intelligence Engine — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Research-grade policy intelligence built from anonymized citizen interactions.",
      },
    ],
  }),
  component: PolicyIntelligencePage,
});

function PolicyIntelligencePage() {
  const fn = useServerFn(getPolicyIntelligenceFn);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["policy-intelligence-snapshot"],
    queryFn: () => fn(),
    staleTime: 60_000,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/20">
      {/* Top utility bar */}
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
              onClick={() => data && exportPolicyReport(data, "gap")}
            >
              <Download className="mr-1 size-4" />
              Welfare Gap
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={!data}
              onClick={() => data && exportPolicyReport(data, "regional")}
            >
              <Download className="mr-1 size-4" />
              Regional
            </Button>
            <Button
              size="sm"
              disabled={!data}
              onClick={() => data && exportPolicyReport(data, "policy")}
            >
              <Download className="mr-1 size-4" />
              Policy Report
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
              Explainable analytics.
            </span>{" "}
            Insights are generated from anonymized citizen interactions, verified
            welfare recommendations, and deterministic aggregation logic — no
            inferred or synthetic data.
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
          Module 16 · Policy Intelligence Engine
        </div>
        <h1 className="mt-6 max-w-4xl text-4xl font-bold leading-[1.05] tracking-tight sm:text-6xl">
          National Welfare Intelligence,{" "}
          <span className="bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            built on evidence.
          </span>
        </h1>
        <p className="mt-5 max-w-2xl text-base text-muted-foreground sm:text-lg">
          A research-grade analytics workspace for policymakers and welfare
          administrators — surfacing delivery gaps, regional risk, and
          explainable policy recommendations.
        </p>
        <div className="mt-8 flex flex-wrap items-center gap-x-6 gap-y-3 text-xs text-muted-foreground">
          <span className="inline-flex items-center gap-1.5">
            <span className="relative flex size-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-500 opacity-75" />
              <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
            </span>
            Live snapshot
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Activity className="size-3.5" />
            Last updated: <span className="font-medium text-foreground">{updated}</span>
          </span>
          <span className="inline-flex items-center gap-1.5">
            <Database className="size-3.5" />
            Sources: Eligibility · Navigator · Assistant · CSC
          </span>
        </div>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {Array.from({ length: 5 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-80 rounded-2xl" />
    </div>
  );
}

function ErrorState({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load policy intelligence right now.
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
        Additional citizen interactions are required to generate policy
        intelligence insights.
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

function Content({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <div className="space-y-20">
      {/* TOP — Executive KPIs */}
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Executive Summary"
          title="National welfare gap at a glance"
          description="Top-line indicators across all analyzed households."
        />
        <Overview snap={snap} />
      </section>

      {/* MIDDLE — Visual analytics */}
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Visual Analytics"
          title="Welfare exclusion & risk distribution"
          description="Where citizens are missing benefits, and which groups are most affected."
        />
        <ExclusionAndRisk snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Regional Intelligence"
          title="State-wise demand & risk concentration"
          description="Where welfare demand is rising and where risk is concentrated."
        />
        <Regional snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Recommendations"
          title="Explainable policy recommendations"
          description="Each recommendation is grounded in measurable evidence from real interactions."
        />
        <Recommendations snap={snap} />
      </section>

      <section className="space-y-8">
        <SectionHeader
          eyebrow="Trend Analysis"
          title="Citizen demand & engagement signals"
          description="Most common goals, recommended categories, and explored guides."
        />
        <Trends snap={snap} />
      </section>

      {/* BOTTOM — Evidence tables & exports */}
      <section className="space-y-8">
        <SectionHeader
          eyebrow="Evidence"
          title="Detailed evidence tables"
          description="Granular data backing every insight above. Use the exports for offline review."
        />
        <EvidenceTables snap={snap} />
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

function Overview({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const o = snap.overview;
  const scoreTone =
    o.averageOpportunityScore >= 70
      ? "emerald"
      : o.averageOpportunityScore >= 40
        ? "amber"
        : "rose";
  const riskTone =
    o.highRiskPercentage >= 40 ? "rose" : o.highRiskPercentage >= 20 ? "amber" : "emerald";

  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-6">
      <div className="lg:col-span-2">
        <Kpi
          featured
          icon={<Gauge className="size-6" />}
          label="Avg Opportunity Score"
          value={`${o.averageOpportunityScore}`}
          suffix="/100"
          description="Mean welfare opportunity capture across households."
          tone={scoreTone}
          trend={o.averageOpportunityScore >= 50 ? "up" : "down"}
        />
      </div>
      <Kpi
        icon={<Target className="size-5" />}
        label="Avg Missed"
        value={String(o.averageMissedOpportunities)}
        description="Schemes the average household misses."
        tone="amber"
      />
      <Kpi
        icon={<BarChart3 className="size-5" />}
        label="Avg Annual Benefits"
        value={formatINR(o.averageEstimatedAnnualBenefitsINR)}
        description="Unrealized financial benefit per household."
        tone="primary"
      />
      <Kpi
        icon={<Layers className="size-5" />}
        label="Households Analyzed"
        value={String(o.householdsAnalyzed)}
        description="Anonymized profiles in this snapshot."
        tone="slate"
      />
      <Kpi
        icon={<ShieldAlert className="size-5" />}
        label="High-Risk %"
        value={`${o.highRiskPercentage}`}
        suffix="%"
        description="Households with critical access gaps."
        tone={riskTone}
        trend={o.highRiskPercentage >= 30 ? "up" : "down"}
      />
    </div>
  );
}

type Tone = "emerald" | "amber" | "rose" | "primary" | "slate";

const TONE_BG: Record<Tone, string> = {
  emerald: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400",
  amber: "bg-amber-500/10 text-amber-600 dark:text-amber-400",
  rose: "bg-rose-500/10 text-rose-600 dark:text-rose-400",
  primary: "bg-primary/10 text-primary",
  slate: "bg-muted text-foreground/70",
};

const TONE_DOT: Record<Tone, string> = {
  emerald: "bg-emerald-500",
  amber: "bg-amber-500",
  rose: "bg-rose-500",
  primary: "bg-primary",
  slate: "bg-muted-foreground",
};

function Kpi({
  icon,
  label,
  value,
  suffix,
  description,
  tone,
  trend,
  featured,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  suffix?: string;
  description: string;
  tone: Tone;
  trend?: "up" | "down";
  featured?: boolean;
}) {
  return (
    <div
      className={cn(
        "group relative flex h-full flex-col overflow-hidden rounded-2xl border bg-card shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl",
        featured ? "p-7 sm:p-8" : "p-6",
      )}
    >
      {featured && (
        <div
          className={cn(
            "pointer-events-none absolute -right-16 -top-16 size-48 rounded-full opacity-40 blur-3xl",
            tone === "rose"
              ? "bg-rose-500/30"
              : tone === "amber"
                ? "bg-amber-500/30"
                : tone === "emerald"
                  ? "bg-emerald-500/30"
                  : "bg-primary/30",
          )}
        />
      )}
      <div className="relative flex items-start justify-between">
        <div
          className={cn(
            "inline-flex items-center justify-center rounded-xl",
            featured ? "size-12" : "size-10",
            TONE_BG[tone],
          )}
        >
          {icon}
        </div>
        <span
          className={cn(
            "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium",
            TONE_BG[tone],
          )}
        >
          <span className={cn("size-1.5 rounded-full", TONE_DOT[tone])} />
          {trend === "up" ? "↑" : trend === "down" ? "↓" : "•"} live
        </span>
      </div>
      <div
        className={cn(
          "relative font-medium uppercase tracking-[0.14em] text-muted-foreground",
          featured ? "mt-6 text-xs" : "mt-5 text-[11px]",
        )}
      >
        {label}
      </div>
      <div className="relative mt-2 flex items-baseline gap-1.5">
        <span
          className={cn(
            "font-bold leading-none tracking-tight tabular-nums",
            featured ? "text-3xl md:text-4xl" : "text-2xl md:text-3xl",
          )}
        >
          {value}
        </span>
        {suffix && (
          <span
            className={cn(
              "font-medium text-muted-foreground",
              featured ? "text-lg" : "text-sm",
            )}
          >
            {suffix}
          </span>
        )}
      </div>
      <p
        className={cn(
          "relative mt-3 leading-relaxed text-muted-foreground",
          featured ? "text-sm" : "text-xs",
        )}
      >
        {description}
      </p>
      <div
        className={cn(
          "absolute inset-x-0 bottom-0 h-0.5 origin-left scale-x-0 bg-gradient-to-r from-primary to-primary/40 transition-transform group-hover:scale-x-100",
        )}
      />
    </div>
  );
}

function ExclusionAndRisk({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-5 lg:grid-cols-3">
        <PanelCard
          title="Highest Missed Categories"
          subtitle="Welfare areas where eligible citizens most often miss out."
          icon={<Target className="size-4" />}
        >
          <RankedBars
            items={snap.exclusion.topMissedCategories.map((c) => ({
              label: c.category,
              value: c.count,
            }))}
            unit=""
            tone="rose"
          />
        </PanelCard>

        <PanelCard
          title="Most Underutilized Schemes"
          subtitle="High eligibility, low engagement."
          icon={<BarChart3 className="size-4" />}
        >
          {snap.exclusion.underutilizedSchemes.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-4">
              {snap.exclusion.underutilizedSchemes.map((s, i) => {
                const util = Math.round(s.utilizationRate * 100);
                return (
                  <li key={s.id} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                            {i + 1}
                          </span>
                          <span className="truncate text-sm font-medium">
                            {s.name}
                          </span>
                        </div>
                        <div className="ml-7 text-[11px] text-muted-foreground">
                          {s.category} · {s.eligibleCount} eligible
                        </div>
                      </div>
                      <Badge
                        variant={util < 20 ? "destructive" : "secondary"}
                        className="shrink-0"
                      >
                        {util}%
                      </Badge>
                    </div>
                    <div className="ml-7">
                      <Progress value={util} className="h-1.5" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Underserved Beneficiary Groups"
          subtitle="Demographic cohorts with the largest welfare gaps."
          icon={<Users className="size-4" />}
        >
          {snap.exclusion.underservedGroups.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-4">
              {snap.exclusion.underservedGroups.map((g) => {
                const tone: Tone =
                  g.averageOpportunityScore < 40
                    ? "rose"
                    : g.averageOpportunityScore < 70
                      ? "amber"
                      : "emerald";
                return (
                  <li key={g.group} className="space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className={cn(
                            "inline-flex size-8 shrink-0 items-center justify-center rounded-lg",
                            TONE_BG[tone],
                          )}
                        >
                          <Users className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold">
                            {g.group}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {g.affectedHouseholds} households · avg {g.averageMissed} missed
                          </div>
                        </div>
                      </div>
                      <Badge
                        variant={tone === "rose" ? "destructive" : "secondary"}
                        className="shrink-0"
                      >
                        {g.averageOpportunityScore}/100
                      </Badge>
                    </div>
                    <div className="pl-10">
                      <Progress value={g.averageOpportunityScore} className="h-1.5" />
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </PanelCard>
      </div>

      <div className="grid gap-5 lg:grid-cols-5">
        <div className="lg:col-span-3">
          <CategoryDistributionChart snap={snap} />
        </div>
        <div className="lg:col-span-2">
          <RiskDonut snap={snap} />
        </div>
      </div>
    </div>
  );
}

function CategoryDistributionChart({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const data = snap.exclusion.topMissedCategories.slice(0, 8).map((c) => ({
    name: c.category.length > 16 ? c.category.slice(0, 16) + "…" : c.category,
    missed: c.count,
  }));

  return (
    <PanelCard
      title="Welfare Gap Distribution by Category"
      subtitle="Volume of missed-opportunity signals across welfare categories."
      icon={<TrendingDown className="size-4" />}
    >
      {data.length === 0 ? (
        <Empty />
      ) : (
        <div className="h-96 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 8, right: 8, left: -10, bottom: 8 }}>
              <defs>
                <linearGradient id="missedGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                  <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                interval={0}
                angle={-20}
                textAnchor="end"
                height={60}
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
              <Bar dataKey="missed" fill="url(#missedGrad)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </PanelCard>
  );
}

function RiskDonut({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const r = snap.risk;
  const total = Math.max(1, r.total);
  const data = [
    { name: "High", value: r.high, color: "hsl(0 84% 60%)" },
    { name: "Moderate", value: r.moderate, color: "hsl(38 92% 50%)" },
    { name: "Low", value: r.low, color: "hsl(160 84% 39%)" },
  ];
  const highPct = Math.round((r.high / total) * 100);

  return (
    <PanelCard
      title="National Risk Distribution"
      subtitle="Share of households by welfare access risk."
      icon={<ShieldCheck className="size-4" />}
    >
      {r.total === 0 ? (
        <Empty />
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
          <div className="relative h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data}
                  innerRadius={72}
                  outerRadius={108}
                  paddingAngle={2}
                  dataKey="value"
                  stroke="none"
                >
                  {data.map((d) => (
                    <Cell key={d.name} fill={d.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
              <div className="text-3xl font-bold leading-none tabular-nums md:text-4xl">{highPct}%</div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                High risk
              </div>
            </div>
          </div>
          <ul className="space-y-2 self-center text-sm">
            {data.map((d) => {
              const pct = Math.round((d.value / total) * 100);
              return (
                <li key={d.name} className="flex items-center justify-between gap-3">
                  <span className="flex items-center gap-2">
                    <span
                      className="inline-block size-2.5 rounded-sm"
                      style={{ background: d.color }}
                    />
                    <span className="font-medium">{d.name}</span>
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {d.value} · {pct}%
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </PanelCard>
  );
}

function Regional({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard
        title="State-wise Demand"
        subtitle="Top welfare interest signals by region."
        icon={<MapPin className="size-4" />}
      >
        {snap.regional.demand.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead>Top Category</TableHead>
                  <TableHead>Top Goal</TableHead>
                  <TableHead className="text-right">Interactions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.regional.demand.map((r) => (
                  <TableRow key={r.state}>
                    <TableCell className="font-medium">
                      <span className="inline-flex items-center gap-1.5">
                        <Building2 className="size-3.5 text-muted-foreground" />
                        {r.state}
                      </span>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{r.topCategory}</TableCell>
                    <TableCell className="text-muted-foreground">{r.topGoal}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.totalInteractions}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="State-wise Welfare Risk"
        subtitle="Risk concentration and average opportunity by region."
        icon={<ShieldAlert className="size-4" />}
      >
        <Heatmap risk={snap.regional.risk} />
      </PanelCard>
    </div>
  );
}

function Recommendations({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  if (snap.recommendations.length === 0) {
    return (
      <div className="rounded-2xl border bg-card p-6 text-sm text-muted-foreground">
        No recommendations available yet — more data is needed.
      </div>
    );
  }
  const priorityTone = (p: string): Tone =>
    p === "high" ? "rose" : p === "medium" ? "amber" : "emerald";

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      {snap.recommendations.map((r) => {
        const tone = priorityTone(r.priority);
        const accent =
          tone === "rose"
            ? "bg-rose-500"
            : tone === "amber"
              ? "bg-amber-500"
              : "bg-emerald-500";
        const priorityChip =
          tone === "rose"
            ? "bg-rose-500/10 text-rose-600 border-rose-500/30 dark:text-rose-400"
            : tone === "amber"
              ? "bg-amber-500/10 text-amber-600 border-amber-500/30 dark:text-amber-400"
              : "bg-emerald-500/10 text-emerald-600 border-emerald-500/30 dark:text-emerald-400";
        return (
          <article
            key={r.id}
            className="group relative flex flex-col overflow-hidden rounded-2xl border bg-card p-7 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-xl sm:p-8"
          >
            <span className={cn("absolute left-0 top-0 h-full w-1.5", accent)} />
            <div className="flex items-start justify-between gap-4">
              <span
                className={cn(
                  "inline-flex size-12 shrink-0 items-center justify-center rounded-2xl",
                  TONE_BG[tone],
                )}
              >
                <Lightbulb className="size-6" />
              </span>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em]",
                  priorityChip,
                )}
              >
                <span className={cn("size-1.5 rounded-full", accent)} />
                {r.priority} priority
              </span>
            </div>
            <h3 className="mt-5 text-xl font-bold leading-snug tracking-tight sm:text-2xl">
              {r.title}
            </h3>
            <p className="mt-3 text-sm leading-relaxed text-muted-foreground sm:text-[15px]">
              {r.rationale}
            </p>
            <div className="mt-6 space-y-3">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-muted-foreground">
                Evidence
              </div>
              <div className="flex flex-wrap gap-2">
                {r.evidence.map((e, i) => (
                  <span
                    key={i}
                    className="inline-flex items-center gap-1.5 rounded-lg border bg-muted/40 px-3 py-1.5 text-xs text-foreground/80"
                  >
                    <span className={cn("size-1.5 rounded-full", accent)} />
                    {e}
                  </span>
                ))}
              </div>
            </div>
            {r.sources.length > 0 && (
              <div className="mt-6 flex flex-wrap items-center gap-2 border-t pt-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Sources
                </span>
                {r.sources.map((s) => (
                  <span
                    key={s}
                    className="rounded-full bg-accent px-2.5 py-0.5 text-[10px] font-medium text-foreground/70"
                  >
                    {s}
                  </span>
                ))}
              </div>
            )}
          </article>
        );
      })}
    </div>
  );
}

function Trends({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const t = snap.trends;
  return (
    <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
      <RankCard
        title="Common Navigator Goals"
        icon={<Target className="size-4" />}
        items={t.navigatorGoals.map((g) => ({ label: g.goal, count: g.count }))}
      />
      <RankCard
        title="Recommended Categories"
        icon={<Layers className="size-4" />}
        items={t.recommendedCategories.map((c) => ({ label: c.category, count: c.count }))}
      />
      <RankCard
        title="Top Action Plans"
        icon={<TrendingUp className="size-4" />}
        items={t.topDownloadedReports.map((s) => ({ label: s.name, count: s.count }))}
      />
      <RankCard
        title="Explored Guides"
        icon={<BarChart3 className="size-4" />}
        items={t.topExploredGuides.map((s) => ({ label: s.name, count: s.count }))}
      />
    </div>
  );
}

function EvidenceTables({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <PanelCard
        title="Underutilized Schemes — Detail"
        subtitle="Full list with eligibility, exploration, and utilization."
        icon={<Database className="size-4" />}
      >
        {snap.exclusion.underutilizedSchemes.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Scheme</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead className="text-right">Eligible</TableHead>
                  <TableHead className="text-right">Explored</TableHead>
                  <TableHead className="text-right">Util.</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.exclusion.underutilizedSchemes.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">{s.name}</TableCell>
                    <TableCell className="text-muted-foreground">{s.category}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {s.eligibleCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {s.exploredCount}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {Math.round(s.utilizationRate * 100)}%
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>

      <PanelCard
        title="State-wise Risk — Detail"
        subtitle="Households, average opportunity score, and risk breakdown."
        icon={<Database className="size-4" />}
      >
        {snap.regional.risk.length === 0 ? (
          <Empty />
        ) : (
          <div className="overflow-x-auto -mx-2">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>State</TableHead>
                  <TableHead className="text-right">HH</TableHead>
                  <TableHead className="text-right">Avg Score</TableHead>
                  <TableHead className="text-right">High</TableHead>
                  <TableHead className="text-right">Mod</TableHead>
                  <TableHead className="text-right">Low</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {snap.regional.risk.map((r) => (
                  <TableRow key={r.state}>
                    <TableCell className="font-medium">{r.state}</TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.households}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums">
                      {r.averageOpportunityScore}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-rose-500">
                      {r.high}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-amber-500">
                      {r.moderate}
                    </TableCell>
                    <TableCell className="text-right font-mono tabular-nums text-emerald-500">
                      {r.low}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}

function Heatmap({ risk }: { risk: StateRiskRow[] }) {
  const states = useMemo(() => ["All states", ...risk.map((r) => r.state)], [risk]);
  const [filter, setFilter] = useState("All states");
  const filtered = filter === "All states" ? risk : risk.filter((r) => r.state === filter);
  const totals = filtered.reduce(
    (acc, r) => ({
      high: acc.high + r.high,
      moderate: acc.moderate + r.moderate,
      low: acc.low + r.low,
    }),
    { high: 0, moderate: 0, low: 0 },
  );
  const total = Math.max(1, totals.high + totals.moderate + totals.low);
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="text-xs text-muted-foreground">
          Filter by state to focus the distribution.
        </div>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-8 w-[180px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {states.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {totals.high + totals.moderate + totals.low === 0 ? (
        <Empty />
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            <div className="bg-rose-500" style={{ width: `${pct(totals.high)}%` }} />
            <div className="bg-amber-500" style={{ width: `${pct(totals.moderate)}%` }} />
            <div className="bg-emerald-500" style={{ width: `${pct(totals.low)}%` }} />
          </div>
          <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm">
            <Legend cls="bg-rose-500" label="High" count={totals.high} pct={pct(totals.high)} />
            <Legend cls="bg-amber-500" label="Moderate" count={totals.moderate} pct={pct(totals.moderate)} />
            <Legend cls="bg-emerald-500" label="Low" count={totals.low} pct={pct(totals.low)} />
          </div>
        </>
      )}
    </div>
  );
}

function Legend({
  cls,
  label,
  count,
  pct,
}: {
  cls: string;
  label: string;
  count: number;
  pct: number;
}) {
  return (
    <div className="rounded-lg border bg-muted/30 p-3">
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        <span className={cn("inline-block size-2 rounded-full", cls)} />
        {label}
      </div>
      <div className="mt-1 text-lg font-bold tabular-nums">
        {count}
        <span className="ml-1 text-xs font-normal text-muted-foreground">
          ({pct}%)
        </span>
      </div>
    </div>
  );
}

function RankedBars({
  items,
  unit,
  tone,
}: {
  items: { label: string; value: number }[];
  unit?: string;
  tone: Tone;
}) {
  if (items.length === 0) return <Empty />;
  const max = Math.max(...items.map((i) => i.value), 1);
  return (
    <ul className="space-y-3">
      {items.map((item, i) => {
        const pct = Math.round((item.value / max) * 100);
        return (
          <li key={`${item.label}-${i}`} className="space-y-1">
            <div className="flex items-center justify-between gap-2 text-sm">
              <span className="flex items-center gap-2 min-w-0">
                <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-muted text-[10px] font-bold text-muted-foreground">
                  {i + 1}
                </span>
                <span className="truncate font-medium">{item.label}</span>
              </span>
              <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
                {item.value}
                {unit}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
              <div
                className={cn(
                  "h-full rounded-full transition-all",
                  tone === "rose"
                    ? "bg-gradient-to-r from-rose-500 to-rose-400"
                    : tone === "amber"
                      ? "bg-gradient-to-r from-amber-500 to-amber-400"
                      : tone === "emerald"
                        ? "bg-gradient-to-r from-emerald-500 to-emerald-400"
                        : "bg-gradient-to-r from-primary to-primary/60",
                )}
                style={{ width: `${pct}%` }}
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

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

function RankCard({
  title,
  icon,
  items,
}: {
  title: string;
  icon: React.ReactNode;
  items: { label: string; count: number }[];
}) {
  const max = Math.max(...items.map((i) => i.count), 1);
  return (
    <div className="flex h-full flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md">
      <div className="mb-3 flex items-center gap-2">
        <span className="inline-flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
          {icon}
        </span>
        <h3 className="text-sm font-semibold">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="mt-2 text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <ol className="mt-1 space-y-2.5 text-sm">
          {items.map((i, idx) => {
            const pct = Math.round((i.count / max) * 100);
            return (
              <li key={`${i.label}-${idx}`} className="space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1.5 min-w-0">
                    <span className="text-xs font-bold text-muted-foreground">
                      {idx + 1}.
                    </span>
                    <span className="truncate text-xs">{i.label}</span>
                  </span>
                  <Badge variant="secondary" className="shrink-0">
                    {i.count}
                  </Badge>
                </div>
                <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-primary/70"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </li>
            );
          })}
        </ol>
      )}
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
