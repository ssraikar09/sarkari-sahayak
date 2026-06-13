import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
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
  WarningSeverity,
} from "@/lib/early-warning/types";

export const Route = createFileRoute("/early-warning")({
  head: () => ({
    meta: [
      { title: "Welfare Early Warning System — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Proactive welfare surveillance with deterministic preventive alerts for policymakers, CSC operators and welfare administrators.",
      },
    ],
  }),
  component: EarlyWarningPage,
});

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

function EarlyWarningPage() {
  const fetchSnap = useServerFn(getEarlyWarningFn);
  const { data, isFetching, refetch } = useQuery<EarlyWarningSnapshot>({
    queryKey: ["early-warning"],
    queryFn: () => fetchSnap(),
    staleTime: 5 * 60 * 1000,
  });

  const [severity, setSeverity] = useState<"all" | WarningSeverity>("all");
  const [region, setRegion] = useState<string>("all");

  const filtered = useMemo<EarlyWarningAlert[]>(() => {
    if (!data) return [];
    return data.alerts.filter(
      (a) =>
        (severity === "all" || a.severity === severity) &&
        (region === "all" || a.region === region),
    );
  }, [data, severity, region]);

  const regions = useMemo(() => {
    if (!data) return [];
    return Array.from(new Set(data.alerts.map((a) => a.region))).sort();
  }, [data]);

  const handleExport = (kind: WarningReportKind) => {
    if (!data) return;
    exportWarningReport(data, kind);
  };

  return (
    <>


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
                <p className="text-sm text-muted-foreground">
                  Proactive surveillance layer that surfaces emerging welfare risks before they
                  escalate.
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </div>

        {/* Summary cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <SummaryCard
            icon={<Siren className="size-4" />}
            label="Active alerts"
            value={data ? data.summary.activeAlerts.toString() : "—"}
            loading={!data}
          />
          <SummaryCard
            icon={<AlertTriangle className="size-4" />}
            label="High-priority alerts"
            value={data ? data.summary.highPriorityAlerts.toString() : "—"}
            tone="warning"
            loading={!data}
          />
          <SummaryCard
            icon={<Users className="size-4" />}
            label="Households at emerging risk"
            value={data ? data.summary.householdsAtEmergingRisk.toLocaleString() : "—"}
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
                  <AlertCard key={alert.id} alert={alert} />
                ))}
              </ul>
            )}
          </section>

          {/* Trends sidebar */}
          <aside className="space-y-4">
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
          </aside>
        </div>

        <p className="mt-8 rounded-xl border bg-muted/40 p-4 text-center text-xs text-muted-foreground">
          All alerts are generated using deterministic welfare signals derived from verified
          platform datasets. Refreshes do not alter alerts unless underlying data changes.
        </p>
      </div>
    </>
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
  tone?: "warning";
  small?: boolean;
  loading?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-2xl border bg-card p-4 shadow-sm",
        tone === "warning" && "border-orange-200/70 dark:border-orange-900/40",
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

function AlertCard({ alert }: { alert: EarlyWarningAlert }) {
  return (
    <li className="rounded-xl border bg-background p-4 shadow-sm">
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
            <ListChecks className="size-3.5" /> Recommended actions
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
            {alert.recommendedActionLabels.map((a) => (
              <li key={a}>{a}</li>
            ))}
          </ul>
        </div>
        <div className="rounded-lg border bg-muted/30 p-3">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Info className="size-3.5" /> Why this alert was generated
          </div>
          <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
            {alert.triggeringConditions.map((t) => (
              <li key={t}>{t}</li>
            ))}
          </ul>
          <div className="mt-2 flex flex-wrap gap-1 text-[10px] text-muted-foreground">
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
          : "No emerging welfare risks detected using current evidence."}
      </p>
      {hasAny && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onClear}>
          Clear filters
        </Button>
      )}
    </div>
  );
}
