import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  RefreshCw,
  Download,
  AlertTriangle,
  Siren,
  Users,
  IndianRupee,
  Clock,
  Database,
  Info,
  ListChecks,
  MapPin,
  TrendingUp,
  ShieldCheck,
  CheckCircle2,
  Activity,
  GaugeCircle,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
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
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

import { getEarlyWarningFn } from "@/lib/early-warning/warning.functions";
import {
  exportWarningReport,
  type WarningReportKind,
} from "@/lib/early-warning/reportExporter";
import type {
  EarlyWarningAlert,
  EarlyWarningSnapshot,
  WarningConfidence,
  WarningLifecycle,
  WarningSeverity,
} from "@/lib/early-warning/types";

export const Route = createFileRoute("/early-warning")({
  head: () => ({
    meta: [
      { title: "Welfare Early Warning System — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Detect emerging welfare risks early using deterministic signals derived from eligibility, utilization, engagement and intervention datasets.",
      },
    ],
  }),
  component: EarlyWarningPage,
});

const RESOLVED_KEY = "ssx_warning_resolutions_v1";

type ResolutionMap = Record<string, { resolvedAt: string; action?: string }>;

function loadResolutions(): ResolutionMap {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(RESOLVED_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveResolutions(map: ResolutionMap) {
  if (typeof window === "undefined") return;
  localStorage.setItem(RESOLVED_KEY, JSON.stringify(map));
}

function formatINRCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  if (value >= 1_00_00_000) return `₹${(value / 1_00_00_000).toFixed(1)} crore`;
  if (value >= 1_00_000) return `₹${(value / 1_00_000).toFixed(1)} lakh`;
  if (value >= 1_000) return `₹${(value / 1_000).toFixed(1)}k`;
  return `₹${Math.round(value)}`;
}

const SEVERITY_BADGE: Record<WarningSeverity, string> = {
  critical: "bg-red-100 text-red-800 border-red-200 dark:bg-red-950/40 dark:text-red-200",
  high: "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-950/40 dark:text-orange-200",
  moderate: "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200",
  low: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
};

const CONFIDENCE_BADGE: Record<WarningConfidence, string> = {
  high: "bg-emerald-100 text-emerald-800 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200",
  medium: "bg-sky-100 text-sky-800 border-sky-200 dark:bg-sky-950/40 dark:text-sky-200",
  low: "bg-zinc-100 text-zinc-700 border-zinc-200 dark:bg-zinc-900/60 dark:text-zinc-200",
};

const LIFECYCLE_LABEL: Record<WarningLifecycle, string> = {
  emerging: "Emerging",
  escalating: "Escalating",
  critical: "Critical",
  mitigated: "Mitigated",
};

function EarlyWarningPage() {
  const fetchSnap = useServerFn(getEarlyWarningFn);
  const { data, isFetching, refetch } = useQuery<EarlyWarningSnapshot>({
    queryKey: ["early-warning"],
    queryFn: () => fetchSnap(),
    staleTime: 5 * 60 * 1000,
  });

  const [severity, setSeverity] = useState<"all" | WarningSeverity>("all");
  const [region, setRegion] = useState<string>("all");
  const [resolutions, setResolutions] = useState<ResolutionMap>(() => loadResolutions());

  useEffect(() => {
    saveResolutions(resolutions);
  }, [resolutions]);

  const enriched = useMemo<EarlyWarningAlert[]>(() => {
    if (!data) return [];
    return data.alerts.map((a) =>
      resolutions[a.id]
        ? { ...a, lifecycle: "mitigated" as WarningLifecycle }
        : a,
    );
  }, [data, resolutions]);

  const filtered = useMemo<EarlyWarningAlert[]>(() => {
    return enriched.filter(
      (a) =>
        (severity === "all" || a.severity === severity) &&
        (region === "all" || a.region === region),
    );
  }, [enriched, severity, region]);

  const regions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.alerts.map((a) => a.region))).sort();
  }, [data]);

  const handleExport = (kind: WarningReportKind) => {
    if (!data) return;
    exportWarningReport(data, kind);
  };

  const resolutionStats = useMemo(() => {
    const open = enriched.filter((a) => a.lifecycle !== "mitigated");
    const resolved = enriched.filter((a) => a.lifecycle === "mitigated");
    const householdsSafeguarded = resolved.reduce(
      (s, a) => s + a.householdsAffected,
      0,
    );
    const benefitsProtected = resolved.reduce(
      (s, a) => s + a.potentialBenefitLossINR,
      0,
    );
    return {
      openCount: open.length,
      resolvedCount: resolved.length,
      householdsSafeguarded,
      benefitsProtected,
    };
  }, [enriched]);

  const lifecycleBreakdown = useMemo(() => {
    const buckets: Record<WarningLifecycle, number> = {
      emerging: 0,
      escalating: 0,
      critical: 0,
      mitigated: 0,
    };
    for (const a of enriched) buckets[a.lifecycle] += 1;
    return buckets;
  }, [enriched]);

  const toggleResolve = (alert: EarlyWarningAlert) => {
    setResolutions((prev) => {
      const next = { ...prev };
      if (next[alert.id]) {
        delete next[alert.id];
      } else {
        next[alert.id] = {
          resolvedAt: new Date().toISOString(),
          action: alert.recommendedActionLabels[0],
        };
      }
      return next;
    });
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            to="/command-center"
            className="mb-2 inline-flex items-center gap-1 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="size-3.5" /> Back to Command Center
          </Link>
          <div className="flex items-center gap-2">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm">
              <Siren className="size-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold leading-tight tracking-tight">
                Welfare Early Warning System
              </h1>
              <p className="max-w-2xl text-sm text-muted-foreground">
                Detect emerging welfare risks early using deterministic signals derived from
                eligibility, utilization, engagement and intervention datasets.
              </p>
            </div>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
          Refresh
        </Button>
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <SummaryCard
          icon={<Siren className="size-4" />}
          label="Active alerts"
          value={data ? data.summary.activeAlerts.toString() : "—"}
          loading={!data}
        />
        <SummaryCard
          icon={<AlertTriangle className="size-4" />}
          label="Critical alerts"
          value={data ? data.summary.criticalAlerts.toString() : "—"}
          tone="critical"
          loading={!data}
        />
        <SummaryCard
          icon={<Users className="size-4" />}
          label="Households under observation"
          value={data ? data.summary.householdsUnderObservation.toLocaleString() : "—"}
          loading={!data}
        />
        <SummaryCard
          icon={<IndianRupee className="size-4" />}
          label="Estimated benefits at risk"
          value={data ? formatINRCompact(data.summary.benefitsAtRiskINR) : "—"}
          tone="warning"
          loading={!data}
        />
        <SummaryCard
          icon={<Clock className="size-4" />}
          label="Last refresh"
          value={data ? new Date(data.generatedAt).toLocaleString() : "—"}
          small
          loading={!data}
        />
      </div>

      {/* Lifecycle timeline */}
      <section className="mt-6 rounded-2xl border bg-card p-5 shadow-sm">
        <div className="mb-3 flex items-center gap-2">
          <Activity className="size-4 text-primary" />
          <h2 className="text-sm font-semibold">Early Warning Timeline</h2>
          <span className="text-xs text-muted-foreground">
            Lifecycle assigned deterministically from signal score and resolution status.
          </span>
        </div>
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {(["emerging", "escalating", "critical", "mitigated"] as WarningLifecycle[]).map(
            (stage) => (
              <LifecycleCard
                key={stage}
                stage={stage}
                count={lifecycleBreakdown[stage]}
                loading={!data}
              />
            ),
          )}
        </div>
      </section>

      {/* Export center */}
      <div className="mt-6 flex flex-wrap items-center gap-2 rounded-2xl border bg-card p-4 shadow-sm">
        <Download className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Export Center</span>
        <div className="ml-auto flex flex-wrap gap-2">
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("early-warning")}>
            Early Warning Report
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("district-summary")}>
            District Alert Summary
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("action-plan")}>
            Preventive Action Plan
          </Button>
          <Button size="sm" variant="outline" disabled={!data} onClick={() => handleExport("evidence-pack")}>
            Alert Evidence Pack
          </Button>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Alert feed */}
        <section className="lg:col-span-2 rounded-2xl border bg-card p-5 shadow-sm">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Alert Feed</h2>
              <p className="text-xs text-muted-foreground">
                Ordered by severity and deterministic signal score.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Select value={severity} onValueChange={(v) => setSeverity(v as typeof severity)}>
                <SelectTrigger className="h-8 w-[140px] text-xs">
                  <SelectValue placeholder="Severity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All severities</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="moderate">Moderate</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
              <Select value={region} onValueChange={setRegion}>
                <SelectTrigger className="h-8 w-[160px] text-xs">
                  <SelectValue placeholder="Region" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All regions</SelectItem>
                  {regions.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {!data ? (
            <div className="space-y-3">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} className="h-28 w-full" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              hasAny={data.alerts.length > 0}
              onClear={() => {
                setSeverity("all");
                setRegion("all");
              }}
            />
          ) : (
            <ul className="space-y-3">
              {filtered.map((alert) => (
                <AlertCard
                  key={alert.id}
                  alert={alert}
                  resolved={!!resolutions[alert.id]}
                  onToggle={() => toggleResolve(alert)}
                />
              ))}
            </ul>
          )}
        </section>

        {/* Right rail: resolution tracker + trends */}
        <aside className="space-y-4">
          <ResolutionTrackerCard stats={resolutionStats} loading={!data} />
          <TrendsCard
            title="Category-wise distribution"
            icon={<ListChecks className="size-4" />}
            rows={data?.trends.categoryDistribution ?? []}
            loading={!data}
          />
          <TrendsCard
            title="Region-wise concentration"
            icon={<MapPin className="size-4" />}
            rows={data?.trends.regionConcentration ?? []}
            loading={!data}
          />
          <TrendsCard
            title="Severity composition"
            icon={<TrendingUp className="size-4" />}
            rows={data?.trends.severityComposition ?? []}
            loading={!data}
          />
          <TrendsCard
            title="Lifecycle distribution"
            icon={<GaugeCircle className="size-4" />}
            rows={data?.trends.lifecycleDistribution ?? []}
            loading={!data}
          />
        </aside>
      </div>

      <p className="mt-8 rounded-xl border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
        All alerts are generated using deterministic welfare signals derived from verified
        platform datasets. Refreshes do not alter alerts unless underlying evidence changes.
      </p>
    </div>
  );
}

function SummaryCard({
  icon,
  label,
  value,
  tone,
  small,
  loading,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  tone?: "warning" | "critical";
  small?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        tone === "warning" && "border-orange-200/70 dark:border-orange-900/40",
        tone === "critical" && "border-red-200/70 dark:border-red-900/40",
      )}
    >
      <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
        {icon}
        {label}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-24" />
      ) : (
        <div className={cn("mt-1 font-semibold tracking-tight", small ? "text-sm" : "text-2xl")}>
          {value}
        </div>
      )}
    </div>
  );
}

function LifecycleCard({
  stage,
  count,
  loading,
}: {
  stage: WarningLifecycle;
  count: number;
  loading?: boolean;
}) {
  const tone: Record<WarningLifecycle, string> = {
    emerging: "border-amber-200/60 bg-amber-50/40 dark:bg-amber-950/20",
    escalating: "border-orange-200/60 bg-orange-50/40 dark:bg-orange-950/20",
    critical: "border-red-200/60 bg-red-50/40 dark:bg-red-950/20",
    mitigated: "border-emerald-200/60 bg-emerald-50/40 dark:bg-emerald-950/20",
  };
  return (
    <div className={cn("rounded-xl border p-3", tone[stage])}>
      <div className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {LIFECYCLE_LABEL[stage]}
      </div>
      {loading ? (
        <Skeleton className="mt-2 h-6 w-16" />
      ) : (
        <div className="mt-1 text-xl font-bold tracking-tight">{count}</div>
      )}
    </div>
  );
}

function AlertCard({
  alert,
  resolved,
  onToggle,
}: {
  alert: EarlyWarningAlert;
  resolved: boolean;
  onToggle: () => void;
}) {
  return (
    <li
      className={cn(
        "rounded-xl border bg-background p-4 shadow-sm",
        resolved && "opacity-75",
      )}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">{alert.title}</h3>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide",
                SEVERITY_BADGE[alert.severity],
              )}
            >
              {alert.severity}
            </span>
            <span
              className={cn(
                "rounded-full border px-2 py-0.5 text-[10px] font-medium",
                CONFIDENCE_BADGE[alert.confidence],
              )}
            >
              {alert.confidence} confidence
            </span>
            <Badge variant="outline" className="text-[10px]">
              {LIFECYCLE_LABEL[alert.lifecycle]}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {alert.categoryLabel}
            </Badge>
            <Badge variant="outline" className="text-[10px]">
              {alert.region}
            </Badge>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">{alert.rationale}</p>
        </div>
        <div className="text-right text-xs">
          <div className="font-semibold text-foreground">
            {alert.householdsAffected.toLocaleString()} households
          </div>
          <div className="text-muted-foreground">
            ~{formatINRCompact(alert.potentialBenefitLossINR)} at risk
          </div>
        </div>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <ListChecks className="size-3.5" /> Preventive actions
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
            {alert.recommendedActionLabels.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="size-3.5" /> Why this alert was triggered
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
            {alert.triggeringConditions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-2 text-[10px] text-muted-foreground">
            <span className="font-semibold">Deterministic rules:</span>{" "}
            {alert.deterministicRules.join(" · ")}
          </div>
          <div className="mt-1 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <Database className="size-3" />
              {alert.referencedDatasets.join(", ")}
            </span>
          </div>
          <div className="mt-1 text-[10px] text-muted-foreground">
            Modules: {alert.contributingModules.join(", ")}
          </div>
        </div>
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 border-t pt-3 text-[11px] text-muted-foreground">
        <span>
          Evidence: {alert.evidence.join(" · ")}
        </span>
        <Button
          size="sm"
          variant={resolved ? "outline" : "secondary"}
          className="h-7 text-xs"
          onClick={onToggle}
        >
          {resolved ? (
            <>
              <CheckCircle2 className="mr-1 size-3.5" /> Mitigated — reopen
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1 size-3.5" /> Mark as mitigated
            </>
          )}
        </Button>
      </div>
    </li>
  );
}

function ResolutionTrackerCard({
  stats,
  loading,
}: {
  stats: {
    openCount: number;
    resolvedCount: number;
    householdsSafeguarded: number;
    benefitsProtected: number;
  };
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <ShieldCheck className="size-4 text-primary" /> Alert Resolution Tracker
      </div>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : (
        <ul className="space-y-1.5 text-xs">
          <Row label="Open alerts" value={stats.openCount.toString()} />
          <Row label="Resolved alerts" value={stats.resolvedCount.toString()} />
          <Row
            label="Households safeguarded"
            value={stats.householdsSafeguarded.toLocaleString()}
          />
          <Row
            label="Benefits protected"
            value={formatINRCompact(stats.benefitsProtected)}
          />
        </ul>
      )}
      <p className="mt-3 text-[10px] text-muted-foreground">
        Resolutions are stored locally per operator and never alter source analytics.
      </p>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <li className="flex items-center justify-between border-b border-dashed border-border/60 py-1 last:border-0">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-semibold tabular-nums">{value}</span>
    </li>
  );
}

function TrendsCard({
  title,
  icon,
  rows,
  loading,
}: {
  title: string;
  icon: React.ReactNode;
  rows: { label: string; count: number; households: number }[];
  loading?: boolean;
}) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        {icon}
        {title}
      </div>
      {loading ? (
        <Skeleton className="h-24 w-full" />
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No data available.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="h-7 text-[10px]">Label</TableHead>
              <TableHead className="h-7 text-right text-[10px]">Alerts</TableHead>
              <TableHead className="h-7 text-right text-[10px]">HH</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.label}>
                <TableCell className="py-1.5 text-xs">
                  <div className="font-medium">{r.label}</div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full bg-gradient-to-r from-primary to-secondary"
                      style={{ width: `${(r.count / max) * 100}%` }}
                    />
                  </div>
                </TableCell>
                <TableCell className="py-1.5 text-right text-xs font-semibold">{r.count}</TableCell>
                <TableCell className="py-1.5 text-right text-xs text-muted-foreground">
                  {r.households.toLocaleString()}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}

function EmptyState({ hasAny, onClear }: { hasAny: boolean; onClear: () => void }) {
  return (
    <div className="rounded-xl border border-dashed bg-muted/30 p-8 text-center">
      <Siren className="mx-auto mb-2 size-6 text-muted-foreground" />
      <p className="text-sm font-medium">
        {hasAny
          ? "No alerts match the current filters."
          : "No emerging welfare risks detected using current deterministic evidence."}
      </p>
      {hasAny && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
