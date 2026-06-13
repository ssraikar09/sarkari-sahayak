import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  Activity,
  Users,
  IndianRupee,
  TrendingUp,
  TrendingDown,
  ShieldCheck,
  GaugeCircle,
  ListChecks,
  MapPin,
  Info,
  CheckCircle2,
  CircleDashed,
  Clock,
  Workflow,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

import { getImpactMonitoringFn } from "@/lib/impact-monitoring/impact.functions";
import {
  exportImpactReport,
  type ImpactReportKind,
} from "@/lib/impact-monitoring/reportExporter";
import type {
  ImpactMonitoringSnapshot,
  InterventionStatus,
} from "@/lib/impact-monitoring/types";

export const Route = createFileRoute("/impact-monitoring")({
  head: () => ({
    meta: [
      { title: "Welfare Impact Monitoring Hub — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Track whether welfare interventions produce measurable, evidence-backed improvements in citizen outcomes.",
      },
    ],
  }),
  component: ImpactMonitoringPage,
});

function formatINRCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} crore`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} lakh`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

const STATUS_LABEL: Record<InterventionStatus, string> = {
  "not-started": "Not Started",
  "in-progress": "In Progress",
  "on-track": "On Track",
  delayed: "Delayed",
  completed: "Completed",
};

const STATUS_BADGE: Record<InterventionStatus, string> = {
  "not-started":
    "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-200",
  "in-progress":
    "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200",
  "on-track":
    "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
  delayed:
    "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
  completed:
    "bg-primary/15 text-primary border-primary/30",
};

function ImpactMonitoringPage() {
  const fetchSnap = useServerFn(getImpactMonitoringFn);
  const { data, isFetching, refetch } = useQuery<ImpactMonitoringSnapshot>({
    queryKey: ["impact-monitoring"],
    queryFn: () => fetchSnap(),
    staleTime: 5 * 60 * 1000,
  });

  const handleExport = (kind: ImpactReportKind) => {
    if (!data) return;
    exportImpactReport(data, kind);
  };

  const hasInterventions = (data?.interventions.length ?? 0) > 0;

  const completedCount = useMemo(
    () => data?.interventions.filter((i) => i.status === "completed").length ?? 0,
    [data],
  );

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/intervention-planner"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Intervention Planner
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm">
              <Activity className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                Welfare Impact Monitoring Hub
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Continuously measure whether interventions are producing meaningful,
                explainable improvements in welfare outcomes.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* Executive KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        <KpiCard
          icon={<Workflow className="size-4" />}
          label="Interventions monitored"
          value={data ? data.summary.interventionsMonitored.toString() : "—"}
          loading={!data}
        />
        <KpiCard
          icon={<Users className="size-4" />}
          label="Households impacted"
          value={
            data
              ? data.summary.householdsPositivelyImpacted.toLocaleString()
              : "—"
          }
          loading={!data}
        />
        <KpiCard
          icon={<Sparkles className="size-4" />}
          label="Opportunity score uplift"
          value={data ? `+${data.summary.opportunityScoreUplift}` : "—"}
          tone="positive"
          loading={!data}
        />
        <KpiCard
          icon={<ShieldCheck className="size-4" />}
          label="Welfare readiness uplift"
          value={data ? `+${data.summary.welfareReadinessUplift}` : "—"}
          tone="positive"
          loading={!data}
        />
        <KpiCard
          icon={<TrendingDown className="size-4" />}
          label="High-risk reduction"
          value={data ? `-${data.summary.highRiskReductionPct}%` : "—"}
          tone="positive"
          loading={!data}
        />
        <KpiCard
          icon={<IndianRupee className="size-4" />}
          label="Annual benefits unlocked"
          value={data ? formatINRCompact(data.summary.annualBenefitsUnlockedINR) : "—"}
          tone="positive"
          loading={!data}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1">
          <Clock className="size-3.5" />
          Last evidence refresh: {data ? new Date(data.generatedAt).toLocaleString() : "—"}
        </span>
        {data && (
          <span>
            Average completion:{" "}
            <span className="font-semibold text-foreground">
              {data.summary.averageCompletionPct}%
            </span>
          </span>
        )}
      </div>

      {/* Export center */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm">
        <Download className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Export Center</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("impact")}>
            Welfare Impact Report
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("effectiveness")}>
            Effectiveness Summary
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("regional")}>
            Regional Assessment
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("evidence")}>
            Outcome Evidence Pack
          </Button>
        </div>
      </div>

      {/* Before / After */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Before vs After Outcome Comparison</h2>
          <span className="text-xs text-muted-foreground">
            Deterministic derivation from Module 19 baseline + Module 21 forecast × completion factor.
          </span>
        </div>
        {!data ? (
          <Skeleton className="h-32 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-5">
            <CompareCard
              label="Opportunity score"
              before={data.beforeAfter.before.opportunityScore.toString()}
              after={data.beforeAfter.after.opportunityScore.toString()}
              deltaPct={data.beforeAfter.deltaPct.opportunityScore}
              positiveUp
            />
            <CompareCard
              label="Welfare readiness"
              before={data.beforeAfter.before.welfareReadinessScore.toString()}
              after={data.beforeAfter.after.welfareReadinessScore.toString()}
              deltaPct={data.beforeAfter.deltaPct.welfareReadinessScore}
              positiveUp
            />
            <CompareCard
              label="High-risk households"
              before={`${data.beforeAfter.before.highRiskPercentage}%`}
              after={`${data.beforeAfter.after.highRiskPercentage}%`}
              deltaPct={data.beforeAfter.deltaPct.highRiskPercentage}
            />
            <CompareCard
              label="Missed opportunities"
              before={`${data.beforeAfter.before.missedOpportunityPercentage}%`}
              after={`${data.beforeAfter.after.missedOpportunityPercentage}%`}
              deltaPct={data.beforeAfter.deltaPct.missedOpportunityPercentage}
            />
            <CompareCard
              label="Annual benefits"
              before={formatINRCompact(data.beforeAfter.before.annualBenefitsINR)}
              after={formatINRCompact(data.beforeAfter.after.annualBenefitsINR)}
              deltaPct={data.beforeAfter.deltaPct.annualBenefitsINR}
              positiveUp
            />
          </div>
        )}
      </section>

      {/* Timeline */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <GaugeCircle className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Impact Timeline</h2>
          <span className="text-xs text-muted-foreground">
            Milestones unlock deterministically as average completion advances.
          </span>
        </div>
        {!data ? (
          <Skeleton className="h-24 w-full" />
        ) : (
          <ol className="grid grid-cols-1 gap-3 md:grid-cols-5">
            {data.timeline.map((m) => (
              <li
                key={m.stage}
                className={cn(
                  "rounded-xl border p-3",
                  m.achieved
                    ? "border-primary/40 bg-primary/5"
                    : "border-border bg-muted/30",
                )}
              >
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {m.achieved ? (
                    <CheckCircle2 className="size-3.5 text-primary" />
                  ) : (
                    <CircleDashed className="size-3.5" />
                  )}
                  {m.label}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  {m.detail}
                </div>
                <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full bg-gradient-to-r from-primary to-secondary"
                    style={{ width: `${m.progressPct}%` }}
                  />
                </div>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Intervention performance */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Intervention Performance Center</h2>
              <p className="text-xs text-muted-foreground">
                Tracking interventions originating from the Welfare Intervention Planner.
              </p>
            </div>
            {data && (
              <Badge variant="outline" className="text-xs">
                {completedCount} completed
              </Badge>
            )}
          </div>
          {!data ? (
            <Skeleton className="h-64 w-full" />
          ) : !hasInterventions ? (
            <EmptyState />
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Intervention</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Reach</TableHead>
                    <TableHead className="text-right">Opp +</TableHead>
                    <TableHead className="text-right">Risk -</TableHead>
                    <TableHead className="text-right">Benefits</TableHead>
                    <TableHead className="text-right">Effectiveness</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.interventions.map((iv) => (
                    <TableRow key={iv.interventionId}>
                      <TableCell>
                        <div className="font-medium">{iv.title}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {iv.kind} · priority {iv.priority}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn("text-[11px]", STATUS_BADGE[iv.status])}
                        >
                          {STATUS_LABEL[iv.status]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {iv.householdsReached.toLocaleString()}
                        <span className="text-muted-foreground">
                          {" "}
                          / {iv.householdsTargeted.toLocaleString()}
                        </span>
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        +{iv.opportunityScoreImprovement}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold text-emerald-700 dark:text-emerald-300">
                        -{iv.highRiskReductionPct}%
                      </TableCell>
                      <TableCell className="text-right text-xs">
                        {formatINRCompact(iv.benefitsUnlockedINR)}
                      </TableCell>
                      <TableCell className="text-right text-xs font-semibold">
                        {iv.effectivenessScore}/100
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </section>

        {/* Right rail: indicators + regional */}
        <aside className="space-y-4">
          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <ListChecks className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Success Indicators</h3>
            </div>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : (
              <ul className="space-y-2 text-xs">
                {data.indicators.map((ind) => (
                  <li
                    key={ind.key}
                    className="rounded-lg border bg-background/60 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{ind.label}</span>
                      <span
                        className={cn(
                          "text-[11px] font-semibold",
                          ind.changePct >= 0
                            ? "text-emerald-700 dark:text-emerald-300"
                            : "text-rose-700 dark:text-rose-300",
                        )}
                      >
                        {ind.changePct >= 0 ? "+" : ""}
                        {ind.changePct}%
                      </span>
                    </div>
                    <div className="mt-0.5 text-[11px] text-muted-foreground">
                      {ind.baseline} {ind.unit} → {ind.current} {ind.unit}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="rounded-2xl border bg-card p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2">
              <MapPin className="size-4 text-primary" />
              <h3 className="text-sm font-semibold">Regional Impact Observatory</h3>
            </div>
            {!data ? (
              <Skeleton className="h-40 w-full" />
            ) : data.regional.length === 0 ? (
              <p className="text-xs text-muted-foreground">
                No regional data available yet.
              </p>
            ) : (
              <ul className="space-y-2 text-xs">
                {data.regional.slice(0, 8).map((r) => (
                  <li
                    key={r.state}
                    className="flex items-center justify-between rounded-lg border bg-background/60 p-2"
                  >
                    <div>
                      <div className="font-medium">{r.state}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {r.householdsImpacted.toLocaleString()} households ·{" "}
                        {formatINRCompact(r.benefitsUnlockedINR)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-[11px] font-semibold text-emerald-700 dark:text-emerald-300">
                        +{r.opportunityScoreImprovement} opp
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        -{r.riskReductionPct}% risk
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </aside>
      </div>

      {/* Explainability */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Info className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Explainability Center</h2>
        </div>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {data.explainers.map((e) => (
              <div
                key={e.metric}
                className="rounded-xl border bg-background/60 p-3 text-xs"
              >
                <div className="font-semibold">{e.metric}</div>
                <div className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Formula:</span>{" "}
                  {e.formula}
                </div>
                <div className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Modules:</span>{" "}
                  {e.modules.join(", ")}
                </div>
                <div className="mt-1 text-muted-foreground">
                  <span className="font-medium text-foreground">Datasets:</span>{" "}
                  {e.datasets.join(", ")}
                </div>
                <div className="mt-1 text-muted-foreground">{e.evidence}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      <p className="mt-8 rounded-xl border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        Impact metrics are derived deterministically from verified welfare datasets and
        intervention records. Refreshes do not alter outcomes unless underlying evidence
        changes.
      </p>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  tone,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "positive";
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        tone === "positive" && "border-emerald-200/70 dark:border-emerald-900/40",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <div className="mt-1 text-xl font-semibold tracking-tight">{value}</div>
      )}
    </div>
  );
}

function CompareCard({
  label,
  before,
  after,
  deltaPct,
  positiveUp,
}: {
  label: string;
  before: string;
  after: string;
  deltaPct: number;
  positiveUp?: boolean;
}) {
  // When positiveUp: up = good. Otherwise (risk/missed): down = good.
  const good = positiveUp ? deltaPct >= 0 : deltaPct <= 0;
  return (
    <div className="rounded-xl border bg-background/60 p-3">
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-2 flex items-baseline gap-2">
        <span className="text-xs text-muted-foreground line-through">{before}</span>
        <span className="text-lg font-bold tracking-tight">{after}</span>
      </div>
      <div
        className={cn(
          "mt-1 inline-flex items-center gap-1 text-[11px] font-semibold",
          good
            ? "text-emerald-700 dark:text-emerald-300"
            : "text-rose-700 dark:text-rose-300",
        )}
      >
        {deltaPct >= 0 ? (
          <TrendingUp className="size-3" />
        ) : (
          <TrendingDown className="size-3" />
        )}
        {deltaPct >= 0 ? "+" : ""}
        {deltaPct}%
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
      <Activity className="mx-auto size-8 text-muted-foreground" />
      <p className="mt-3 text-sm font-medium">
        No completed interventions are available for impact assessment.
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Generate intervention plans from the Welfare Intervention Planner to begin
        impact monitoring.
      </p>
      <Link
        to="/intervention-planner"
        className="mt-3 inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
      >
        Open Intervention Planner →
      </Link>
    </div>
  );
}
