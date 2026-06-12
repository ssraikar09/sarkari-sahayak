import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Building2,
  Database,
  Download,
  Flag,
  Gauge,
  Info,
  Lightbulb,
  RefreshCw,
  ShieldAlert,
  Siren,
  Target,
  TrendingUp,
  Users,
  Activity,
} from "lucide-react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { AppShell } from "@/components/layout/AppShell";
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
import { getCommandCenterFn } from "@/lib/command-center/nationalAnalytics";
import { exportCommandReport } from "@/lib/command-center/reportExporter";
import { mergeRecommendations } from "@/lib/command-center/recommendationBuilder";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  NationalSnapshot,
  StateLeaderboardRow,
  CommandAlertPriority,
} from "@/lib/command-center/types";

export const Route = createFileRoute("/command-center")({
  head: () => ({
    meta: [
      { title: "National Welfare Command Center — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "A national operations dashboard consolidating welfare delivery analytics, alerts and evidence-backed interventions for policymakers.",
      },
      { property: "og:title", content: "National Welfare Command Center — Sarkari Sahayak X" },
      {
        property: "og:description",
        content:
          "Monitor welfare delivery performance across states with explainable, evidence-backed alerts and interventions.",
      },
    ],
  }),
  component: CommandCenterPage,
});

const PRIORITY_STYLES: Record<
  CommandAlertPriority,
  { badge: string; ring: string; label: string }
> = {
  critical: {
    badge: "bg-red-500/15 text-red-700 dark:text-red-300 border-red-500/30",
    ring: "border-l-red-500",
    label: "Critical",
  },
  high: {
    badge: "bg-orange-500/15 text-orange-700 dark:text-orange-300 border-orange-500/30",
    ring: "border-l-orange-500",
    label: "High",
  },
  medium: {
    badge: "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30",
    ring: "border-l-amber-500",
    label: "Medium",
  },
  low: {
    badge: "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30",
    ring: "border-l-emerald-500",
    label: "Low",
  },
};

function CommandCenterPage() {
  const fn = useServerFn(getCommandCenterFn);
  const { data, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["command-center"],
    queryFn: () => fn({ data: {} }),
    staleTime: 60_000,
  });

  return (
    <AppShell>
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Header isFetching={isFetching} onRefresh={() => refetch()} snap={data} />
        {isLoading || !data ? (
          <LoadingState />
        ) : !data.hasSufficientData ? (
          <EmptyState />
        ) : (
          <Content snap={data} />
        )}
      </div>
    </AppShell>
  );
}

function Header({
  isFetching,
  onRefresh,
  snap,
}: {
  isFetching: boolean;
  onRefresh: () => void;
  snap?: NationalSnapshot;
}) {
  return (
    <header className="mb-8 grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4 sm:flex sm:items-center sm:justify-between">
      <div className="min-w-0">
        <Link
          to="/dashboard"
          className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="size-3.5" /> Back to Dashboard
        </Link>
        <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
          <Siren className="size-3.5" /> National Welfare Command Center
        </div>
        <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
          Welfare Operations · National View
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground sm:text-base">
          Consolidated, evidence-backed view of welfare delivery performance,
          regional risk, and recommended interventions — built from existing
          analytics with deterministic, auditable logic.
        </p>
        {snap ? (
          <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1">
              <Database className="size-3" /> Updated{" "}
              {new Date(snap.generatedAt).toLocaleString()}
            </span>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-border/60 px-2.5 py-1">
              Sources: Policy Intelligence · Outcome Prediction · Digital Twin · CSC · Insights
            </span>
          </div>
        ) : null}
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button variant="outline" size="sm" onClick={onRefresh} disabled={isFetching}>
          <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>
    </header>
  );
}

function LoadingState() {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 rounded-2xl" />
      <Skeleton className="h-96 rounded-2xl" />
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border border-dashed border-border bg-card/50 p-12 text-center">
      <Gauge className="mx-auto size-10 text-muted-foreground" />
      <h2 className="mt-4 text-xl font-bold">Awaiting analytics signal</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        The Command Center activates after at least one citizen eligibility
        assessment has been recorded. Run an assessment from the Eligibility
        module to seed the national view.
      </p>
    </div>
  );
}

function Content({ snap }: { snap: NationalSnapshot }) {
  const recs = useMemo(
    () => mergeRecommendations(snap.upstreamRecommendations, snap.interventions),
    [snap.upstreamRecommendations, snap.interventions],
  );

  return (
    <div className="space-y-12">
      <OverviewSection snap={snap} />
      <ExportBar snap={snap} />
      <LeaderboardSection rows={snap.leaderboard} />
      <div className="grid gap-6 lg:grid-cols-2">
        <AlertCenter snap={snap} />
        <InterventionPanel recs={recs} />
      </div>
      <TrendsSection snap={snap} />
      <div className="grid gap-6 lg:grid-cols-5">
        <UnderperformingSection snap={snap} />
        <GoalTracker snap={snap} />
      </div>
      <ExplainabilityPanel snap={snap} />
    </div>
  );
}

function SectionHeader({
  eyebrow,
  title,
  description,
  icon: Icon,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  icon: typeof BarChart3;
}) {
  return (
    <div className="mb-5">
      <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
        <Icon className="size-3" /> {eyebrow}
      </div>
      <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
      {description ? (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      ) : null}
    </div>
  );
}

function Kpi({
  label,
  value,
  caption,
  icon: Icon,
  tone,
  span,
}: {
  label: string;
  value: string;
  caption?: string;
  icon: typeof BarChart3;
  tone?: "primary" | "warn" | "good" | "neutral";
  span?: boolean;
}) {
  const toneClass =
    tone === "primary"
      ? "bg-primary/10 text-primary border-primary/20"
      : tone === "warn"
        ? "bg-orange-500/10 text-orange-600 dark:text-orange-300 border-orange-500/20"
        : tone === "good"
          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300 border-emerald-500/20"
          : "bg-muted text-foreground border-border";
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-5 shadow-sm",
        span && "sm:col-span-2",
      )}
    >
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          {label}
        </div>
        <div className={cn("grid size-9 place-items-center rounded-xl border", toneClass)}>
          <Icon className="size-4" />
        </div>
      </div>
      <div className={cn("mt-3 font-black tracking-tight", span ? "text-5xl" : "text-3xl")}>
        {value}
      </div>
      {caption ? (
        <div className="mt-1 text-xs text-muted-foreground">{caption}</div>
      ) : null}
    </div>
  );
}

function OverviewSection({ snap }: { snap: NationalSnapshot }) {
  const { overview } = snap;
  return (
    <section>
      <SectionHeader
        eyebrow="National Overview"
        title="Welfare delivery at a glance"
        description="Aggregated from eligibility assessments, navigator runs, application guides, and CSC operations."
        icon={Gauge}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
        <Kpi
          label="Welfare Readiness"
          value={`${overview.welfareReadinessScore}/100`}
          caption="0.6 × opportunity score + 0.4 × (100 − high-risk %)"
          icon={Gauge}
          tone="primary"
          span
        />
        <Kpi
          label="Households Analyzed"
          value={overview.householdsAnalyzed.toLocaleString()}
          icon={Users}
          tone="neutral"
        />
        <Kpi
          label="Eligible Schemes"
          value={overview.totalEligibleSchemes.toLocaleString()}
          caption="Across all assessed households"
          icon={Building2}
          tone="neutral"
        />
        <Kpi
          label="National Opportunity"
          value={`${overview.averageOpportunityScore}/100`}
          icon={Target}
          tone="good"
        />
        <Kpi
          label="High-Risk Households"
          value={`${overview.highRiskPercentage}%`}
          caption="Opportunity score < 40"
          icon={ShieldAlert}
          tone="warn"
        />
        <Kpi
          label="Benefits Unlocked"
          value={formatINR(overview.totalEstimatedBenefitsUnlockedINR)}
          caption="Estimated annual value of explored schemes"
          icon={TrendingUp}
          tone="good"
          span
        />
      </div>
    </section>
  );
}

function ExportBar({ snap }: { snap: NationalSnapshot }) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-border bg-muted/40 px-4 py-3">
      <div className="mr-auto flex items-center gap-2 text-xs font-semibold text-muted-foreground">
        <Download className="size-3.5" /> Research Export · print to PDF
      </div>
      <Button variant="outline" size="sm" onClick={() => exportCommandReport(snap, "national")}>
        National Report
      </Button>
      <Button variant="outline" size="sm" onClick={() => exportCommandReport(snap, "intervention")}>
        Intervention Summary
      </Button>
      <Button size="sm" onClick={() => exportCommandReport(snap, "command")}>
        Command Intelligence
      </Button>
    </div>
  );
}

type SortKey = keyof Pick<
  StateLeaderboardRow,
  "opportunityScore" | "highRiskPercentage" | "estimatedBenefitsUnlockedINR" | "welfareReadinessScore" | "households"
>;

function LeaderboardSection({ rows }: { rows: StateLeaderboardRow[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("welfareReadinessScore");
  const [filter, setFilter] = useState("");

  const sorted = useMemo(() => {
    const filtered = rows.filter((r) =>
      filter ? r.state.toLowerCase().includes(filter.toLowerCase()) : true,
    );
    return [...filtered].sort((a, b) => {
      if (sortKey === "highRiskPercentage") return a[sortKey] - b[sortKey];
      return b[sortKey] - a[sortKey];
    });
  }, [rows, sortKey, filter]);

  return (
    <section>
      <SectionHeader
        eyebrow="State Performance"
        title="Leaderboard"
        description="Rank states across opportunity, risk, benefits unlocked and welfare readiness."
        icon={Flag}
      />
      <div className="rounded-2xl border border-border bg-card">
        <div className="grid gap-3 border-b border-border p-4 sm:grid-cols-[1fr_auto]">
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="Filter by state…"
            className="h-9 w-full rounded-md border border-input bg-background px-3 text-sm"
          />
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger className="h-9 w-full sm:w-64">
              <SelectValue placeholder="Sort by" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="welfareReadinessScore">Sort: Welfare Readiness</SelectItem>
              <SelectItem value="opportunityScore">Sort: Opportunity Score</SelectItem>
              <SelectItem value="highRiskPercentage">Sort: High-Risk % (asc)</SelectItem>
              <SelectItem value="estimatedBenefitsUnlockedINR">Sort: Benefits Unlocked</SelectItem>
              <SelectItem value="households">Sort: Households</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>State</TableHead>
              <TableHead className="text-right">Households</TableHead>
              <TableHead className="text-right">Opportunity</TableHead>
              <TableHead className="text-right">High-Risk %</TableHead>
              <TableHead className="text-right">Readiness</TableHead>
              <TableHead className="text-right">Benefits Unlocked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sorted.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-sm text-muted-foreground">
                  No matching states.
                </TableCell>
              </TableRow>
            ) : (
              sorted.map((r) => (
                <TableRow key={r.state}>
                  <TableCell className="font-semibold">{r.state}</TableCell>
                  <TableCell className="text-right">{r.households}</TableCell>
                  <TableCell className="text-right">{r.opportunityScore}/100</TableCell>
                  <TableCell className="text-right">
                    <Badge
                      variant="outline"
                      className={cn(
                        r.highRiskPercentage >= 40
                          ? "border-red-500/40 text-red-600 dark:text-red-300"
                          : r.highRiskPercentage >= 20
                            ? "border-amber-500/40 text-amber-600 dark:text-amber-300"
                            : "border-emerald-500/40 text-emerald-600 dark:text-emerald-300",
                      )}
                    >
                      {r.highRiskPercentage}%
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right font-semibold">
                    {r.welfareReadinessScore}/100
                  </TableCell>
                  <TableCell className="text-right">
                    {formatINR(r.estimatedBenefitsUnlockedINR)}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function AlertCenter({ snap }: { snap: NationalSnapshot }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Welfare Alert Center"
        title="Regions and signals needing attention"
        icon={Siren}
      />
      <div className="space-y-3">
        {snap.alerts.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No alerts triggered at current thresholds.
          </div>
        ) : (
          snap.alerts.map((a) => {
            const style = PRIORITY_STYLES[a.priority];
            return (
              <article
                key={a.id}
                className={cn(
                  "rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm",
                  style.ring,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="text-base font-bold">{a.title}</h3>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {a.region} · {a.metric}
                    </div>
                  </div>
                  <Badge variant="outline" className={style.badge}>
                    {style.label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{a.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {a.evidence.map((e, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]"
                    >
                      {e}
                    </span>
                  ))}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function InterventionPanel({
  recs,
}: {
  recs: ReturnType<typeof mergeRecommendations>;
}) {
  return (
    <section>
      <SectionHeader
        eyebrow="Intervention Recommendations"
        title="Evidence-backed actions"
        icon={Lightbulb}
      />
      <div className="space-y-3">
        {recs.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-border bg-card/50 p-6 text-sm text-muted-foreground">
            No recommendations yet.
          </div>
        ) : (
          recs.map((r) => {
            const style = PRIORITY_STYLES[r.priority];
            return (
              <article
                key={r.id}
                className={cn(
                  "rounded-2xl border border-border border-l-4 bg-card p-4 shadow-sm",
                  style.ring,
                )}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <h3 className="text-base font-bold">{r.title}</h3>
                  <Badge variant="outline" className={style.badge}>
                    {style.label}
                  </Badge>
                </div>
                <p className="mt-2 text-sm text-muted-foreground">{r.rationale}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {r.evidence.map((e, i) => (
                    <span
                      key={i}
                      className="rounded-full border border-border bg-muted px-2 py-0.5 text-[11px]"
                    >
                      {e}
                    </span>
                  ))}
                </div>
                {r.expectedImpact ? (
                  <div className="mt-3 rounded-lg bg-primary/5 px-3 py-2 text-xs">
                    <span className="font-semibold">Expected impact:</span>{" "}
                    {r.expectedImpact}
                  </div>
                ) : null}
                <div className="mt-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                  Sources: {r.sources.join(" · ")}
                </div>
              </article>
            );
          })
        )}
      </div>
    </section>
  );
}

function TrendsSection({ snap }: { snap: NationalSnapshot }) {
  const navData = snap.trends.navigatorGoals.map((g) => ({
    name: g.goal,
    value: g.count,
  }));
  const catData = snap.trends.recommendedCategories.map((c) => ({
    name: c.category,
    value: c.count,
  }));
  return (
    <section>
      <SectionHeader
        eyebrow="National Trends"
        title="Adoption, demand, and risk distribution"
        icon={TrendingUp}
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-bold">Navigator adoption by goal</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={navData}>
                <defs>
                  <linearGradient id="ccNav" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.45} />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.05} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="value"
                  stroke="hsl(var(--primary))"
                  fill="url(#ccNav)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5">
          <div className="mb-3 text-sm font-bold">Recommended categories</div>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={catData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Bar dataKey="value" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <RiskTile label="High Risk" value={snap.risk.high} total={snap.risk.total} tone="warn" />
        <RiskTile
          label="Moderate Risk"
          value={snap.risk.moderate}
          total={snap.risk.total}
          tone="neutral"
        />
        <RiskTile label="Low Risk" value={snap.risk.low} total={snap.risk.total} tone="good" />
      </div>
    </section>
  );
}

function RiskTile({
  label,
  value,
  total,
  tone,
}: {
  label: string;
  value: number;
  total: number;
  tone: "warn" | "good" | "neutral";
}) {
  const pct = total ? Math.round((value / total) * 100) : 0;
  const color =
    tone === "warn"
      ? "text-red-600 dark:text-red-300"
      : tone === "good"
        ? "text-emerald-600 dark:text-emerald-300"
        : "text-muted-foreground";
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between text-xs font-semibold">
        <span className="text-muted-foreground">{label}</span>
        <span className={color}>{pct}%</span>
      </div>
      <div className="mt-2 text-2xl font-bold">{value}</div>
      <Progress value={pct} className="mt-2 h-1.5" />
    </div>
  );
}

function UnderperformingSection({ snap }: { snap: NationalSnapshot }) {
  return (
    <section className="lg:col-span-3">
      <SectionHeader
        eyebrow="Underperforming Schemes"
        title="Largest opportunity gaps"
        icon={Activity}
      />
      <div className="overflow-hidden rounded-2xl border border-border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Scheme</TableHead>
              <TableHead>Category</TableHead>
              <TableHead className="text-right">Eligible</TableHead>
              <TableHead className="text-right">Utilization</TableHead>
              <TableHead className="text-right">Gap</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {snap.underperformingSchemes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-sm text-muted-foreground">
                  No underperforming schemes detected.
                </TableCell>
              </TableRow>
            ) : (
              snap.underperformingSchemes.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.name}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {s.category}
                  </TableCell>
                  <TableCell className="text-right">{s.eligibleHouseholds}</TableCell>
                  <TableCell className="text-right">{s.utilizationPercent}%</TableCell>
                  <TableCell className="text-right font-semibold text-orange-600 dark:text-orange-300">
                    {s.opportunityGap}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </section>
  );
}

function GoalTracker({ snap }: { snap: NationalSnapshot }) {
  return (
    <section className="lg:col-span-2">
      <SectionHeader
        eyebrow="Welfare Goal Tracker"
        title="Progress across sectors"
        icon={Target}
      />
      <div className="space-y-3 rounded-2xl border border-border bg-card p-5">
        {snap.goals.map((g) => (
          <div key={g.goal}>
            <div className="flex items-center justify-between text-sm">
              <span className="font-semibold">{g.goal}</span>
              <span className="text-xs text-muted-foreground">
                {g.utilizationPercent}% · {g.exploredOccurrences}/{g.eligibleSchemes}
              </span>
            </div>
            <Progress value={g.utilizationPercent} className="mt-1.5 h-2" />
            <div className="mt-1 text-[11px] text-muted-foreground">
              Navigator demand: {g.navigatorDemand}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function ExplainabilityPanel({ snap }: { snap: NationalSnapshot }) {
  return (
    <section>
      <SectionHeader
        eyebrow="Explainability"
        title="How these insights were generated"
        icon={Info}
      />
      <div className="grid gap-4 rounded-2xl border border-border bg-card p-5 lg:grid-cols-3">
        <div>
          <h3 className="text-sm font-bold">Why these alerts?</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Alerts trigger when state opportunity scores fall below 50/100,
            when ≥40% of households are high-risk, when scheme utilization
            falls below 30% with ≥2 eligible households, or when
            document-heavy categories show ≥3 missed opportunities.
          </p>
        </div>
        <div>
          <h3 className="text-sm font-bold">Contributing analytics</h3>
          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
            <li>Eligibility assessments (latest per household)</li>
            <li>Application guide and navigator usage</li>
            <li>Assistant queries and search logs</li>
            <li>Policy Intelligence regional rollups</li>
            <li>Outcome Prediction and Digital Twin baselines</li>
          </ul>
        </div>
        <div>
          <h3 className="text-sm font-bold">Evidence sources</h3>
          <ul className="mt-1 list-disc pl-4 text-xs text-muted-foreground">
            <li>eligibility_assessments · citizen_profiles</li>
            <li>navigator_usage_logs · application_guide_usage</li>
            <li>government_schemes · assistant_queries</li>
            <li>scheme_search_logs</li>
          </ul>
        </div>
      </div>
    </section>
  );
}
