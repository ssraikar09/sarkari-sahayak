import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  RefreshCw,
  Download,
  Telescope,
  Users,
  FileText,
  GaugeCircle,
  ShieldCheck,
  IndianRupee,
  AlertTriangle,
  Workflow,
  Siren,
  Activity,
  CheckCircle2,
  CircleDashed,
  Clock,
  Sparkles,
  Layers,
  TrendingUp,
  Info,
  Network,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

import { getWelfareObservatoryFn } from "@/lib/welfare-observatory/observatory.functions";
import {
  exportObservatoryReport,
  type ObservatoryReportKind,
} from "@/lib/welfare-observatory/reportExporter";
import type { WelfareObservatorySnapshot } from "@/lib/welfare-observatory/types";

export const Route = createFileRoute("/welfare-observatory")({
  head: () => ({
    meta: [
      { title: "National Welfare Intelligence Observatory — Sarkari Sahayak" },
      {
        name: "description",
        content:
          "Unified intelligence layer consolidating citizen insights, policy intelligence, intervention planning, impact monitoring, offline delivery and early warning.",
      },
    ],
  }),
  component: WelfareObservatoryPage,
});

function formatINRCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} Cr`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} L`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

function WelfareObservatoryPage() {
  const fetchSnap = useServerFn(getWelfareObservatoryFn);
  const { data, isFetching, refetch } = useQuery<WelfareObservatorySnapshot>({
    queryKey: ["welfare-observatory"],
    queryFn: () => fetchSnap(),
    staleTime: 5 * 60 * 1000,
  });

  const handleExport = (kind: ObservatoryReportKind) => {
    if (!data) return;
    exportObservatoryReport(data, kind);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      {/* Header */}
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm">
              <Telescope className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                National Welfare Intelligence Observatory
              </h1>
              <p className="max-w-3xl text-sm text-muted-foreground">
                The unified intelligence layer of Sarkari Sahayak — consolidating
                citizen, policy, planning, delivery, warning and impact insights.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* National snapshot KPIs */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <KpiCard icon={<Users className="size-4" />} label="Households analyzed" value={data ? data.summary.householdsAnalyzed.toLocaleString() : "—"} loading={!data} />
        <KpiCard icon={<FileText className="size-4" />} label="Schemes monitored" value={data ? data.summary.schemesMonitored.toLocaleString() : "—"} loading={!data} />
        <KpiCard icon={<GaugeCircle className="size-4" />} label="Opportunity score" value={data ? `${data.summary.opportunityScore}/100` : "—"} loading={!data} />
        <KpiCard icon={<ShieldCheck className="size-4" />} label="Welfare readiness" value={data ? `${data.summary.welfareReadinessScore}/100` : "—"} loading={!data} />
        <KpiCard icon={<IndianRupee className="size-4" />} label="Annual benefits unlocked" value={data ? formatINRCompact(data.summary.annualBenefitsUnlockedINR) : "—"} tone="positive" loading={!data} />
        <KpiCard icon={<AlertTriangle className="size-4" />} label="High-risk households" value={data ? data.summary.highRiskHouseholds.toLocaleString() : "—"} loading={!data} />
        <KpiCard icon={<Workflow className="size-4" />} label="Active interventions" value={data ? data.summary.activeInterventions.toString() : "—"} loading={!data} />
        <KpiCard icon={<Siren className="size-4" />} label="Active alerts" value={data ? data.summary.activeAlerts.toString() : "—"} loading={!data} />
        <KpiCard icon={<Activity className="size-4" />} label="Impact initiatives" value={data ? data.summary.impactInitiativesMonitored.toString() : "—"} loading={!data} />
        <KpiCard icon={<Clock className="size-4" />} label="Last refresh" value={data ? new Date(data.generatedAt).toLocaleString() : "—"} loading={!data} small />
      </div>

      {/* Export center */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm">
        <Download className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">National Report Center</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("national")}>National Intelligence Report</Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("executive")}>Executive Summary</Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("ecosystem")}>Welfare Ecosystem</Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("annual")}>Annual Insights Pack</Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("cross-module")}>Cross-Module Report</Button>
        </div>
      </div>

      {/* Lifecycle Observatory */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Layers className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Welfare Lifecycle Observatory</h2>
          <span className="text-xs text-muted-foreground">
            Complete Sarkari Sahayak journey, end to end.
          </span>
        </div>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {data.lifecycle.map((stage, idx) => (
              <li key={stage.key} className="rounded-xl border bg-background/60 p-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    <span className="grid size-5 place-items-center rounded-full bg-primary/10 text-[10px] font-bold text-primary">
                      {idx + 1}
                    </span>
                    {stage.label}
                  </div>
                  <Badge variant="outline" className="text-[10px]">
                    {stage.module}
                  </Badge>
                </div>
                <p className="mt-2 text-xs text-muted-foreground">{stage.description}</p>
                <div className="mt-2 flex items-center justify-between text-[11px]">
                  <span className="text-muted-foreground">{stage.metricLabel}</span>
                  <span className="font-semibold text-foreground">{stage.metricValue}</span>
                </div>
                <Link
                  to={stage.route}
                  className="mt-2 inline-flex items-center gap-1 text-[11px] font-medium text-primary hover:underline"
                >
                  Open module →
                </Link>
              </li>
            ))}
          </ol>
        )}
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Intelligence summary */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <Sparkles className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">National Intelligence Summary</h2>
          </div>
          {!data ? (
            <Skeleton className="h-64 w-full" />
          ) : data.insights.length === 0 ? (
            <EmptyState />
          ) : (
            <ul className="space-y-3">
              {data.insights.map((ins) => (
                <li key={ins.id} className="rounded-xl border bg-background/60 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="font-medium text-sm">{ins.title}</div>
                    <Badge variant="outline" className="text-[10px] capitalize">
                      {ins.kind.replace(/-/g, " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{ins.detail}</p>
                  <div className="mt-2 grid grid-cols-1 gap-1 text-[11px] text-muted-foreground sm:grid-cols-2">
                    <div><span className="font-semibold text-foreground">Modules:</span> {ins.contributingModules.join(", ")}</div>
                    <div><span className="font-semibold text-foreground">Datasets:</span> {ins.datasets.join(", ")}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-foreground">Rules:</span> {ins.rules.join(" · ")}</div>
                    <div className="sm:col-span-2"><span className="font-semibold text-foreground">Evidence:</span> {ins.evidence}</div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Observatory timeline */}
        <aside className="rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <GaugeCircle className="size-4 text-primary" />
            <h3 className="text-sm font-semibold">Observatory Timeline</h3>
          </div>
          {!data ? (
            <Skeleton className="h-64 w-full" />
          ) : (
            <ol className="space-y-2">
              {data.timeline.map((m) => (
                <li
                  key={m.stage}
                  className={cn(
                    "rounded-lg border p-2.5",
                    m.achieved ? "border-primary/40 bg-primary/5" : "border-border bg-muted/30",
                  )}
                >
                  <div className="flex items-center gap-2 text-xs font-semibold">
                    {m.achieved ? (
                      <CheckCircle2 className="size-3.5 text-primary" />
                    ) : (
                      <CircleDashed className="size-3.5 text-muted-foreground" />
                    )}
                    {m.label}
                  </div>
                  <div className="mt-0.5 text-[11px] text-muted-foreground">{m.detail}</div>
                  <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${m.progressPct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ol>
          )}
        </aside>
      </div>

      {/* Analytics center */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <TrendingUp className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Observatory Analytics Center</h2>
        </div>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {data.trends.map((t) => {
              const max = Math.max(1, ...t.series.map((p) => p.value));
              return (
                <div key={t.key} className="rounded-xl border bg-background/60 p-3">
                  <div className="flex items-center justify-between">
                    <div className="text-xs font-semibold">{t.label}</div>
                    <Badge variant="outline" className="text-[10px]">
                      {t.delta >= 0 ? "+" : ""}
                      {t.delta} {t.deltaUnit}
                    </Badge>
                  </div>
                  <div className="mt-3 flex items-end gap-2 h-20">
                    {t.series.map((p) => (
                      <div key={p.label} className="flex flex-1 flex-col items-center gap-1">
                        <div
                          className="w-full rounded-t bg-gradient-to-t from-primary to-secondary"
                          style={{ height: `${(p.value / max) * 100}%`, minHeight: 4 }}
                          title={`${p.label}: ${p.value}${p.unit}`}
                        />
                        <div className="text-[10px] text-muted-foreground">{p.label}</div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-1 text-[10px] text-muted-foreground">{t.source}</div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Cross-module matrix */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-4 flex items-center gap-2">
          <Network className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Cross-Module Intelligence Matrix</h2>
        </div>
        {!data ? (
          <Skeleton className="h-40 w-full" />
        ) : (
          <div className="space-y-4">
            {data.matrix.map((band) => (
              <div key={band.band}>
                <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {band.band}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  {band.modules.map((m) => (
                    <div key={m.name} className="rounded-lg border bg-background/60 p-3">
                      <div className="text-sm font-semibold">{m.name}</div>
                      <div className="mt-1 text-[11px] text-muted-foreground">
                        <b className="text-foreground">Contribution:</b> {m.contribution}
                      </div>
                      <div className="text-[11px] text-muted-foreground">
                        <b className="text-foreground">Outcome:</b> {m.outcome}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

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
              <div key={e.insight} className="rounded-xl border bg-background/60 p-3">
                <div className="text-sm font-semibold">{e.insight}</div>
                <div className="mt-1 text-[11px] text-muted-foreground">
                  <b className="text-foreground">Modules:</b> {e.modules.join(", ")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <b className="text-foreground">Datasets:</b> {e.datasets.join(", ")}
                </div>
                <div className="text-[11px] text-muted-foreground">
                  <b className="text-foreground">Rules:</b> {e.rules.join(" · ")}
                </div>
                <div className="mt-1 text-[11px] text-muted-foreground">{e.evidence}</div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Trust footer */}
      <div className="mt-6 rounded-2xl border border-primary/30 bg-primary/5 p-4 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground">Trust & Transparency:</span>{" "}
        All observatory insights are derived deterministically from verified welfare
        datasets generated throughout the Sarkari Sahayak ecosystem. Refreshes do not
        alter outcomes unless underlying evidence changes.
      </div>
    </div>
  );
}

function KpiCard({
  icon,
  label,
  value,
  loading,
  tone,
  small,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  loading?: boolean;
  tone?: "positive";
  small?: boolean;
}) {
  return (
    <div className="rounded-xl border bg-card p-3 shadow-sm">
      <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        {icon}
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-20" />
      ) : (
        <div
          className={cn(
            "mt-1 font-bold leading-tight tracking-tight",
            small ? "text-xs" : "text-lg",
            tone === "positive" && "text-emerald-700 dark:text-emerald-300",
          )}
        >
          {value}
        </div>
      )}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-6 text-center">
      <Telescope className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-2 text-sm font-medium">Observatory awaiting evidence</p>
      <p className="text-xs text-muted-foreground">
        Once households are analyzed and interventions are planned, national insights will appear here.
      </p>
    </div>
  );
}
