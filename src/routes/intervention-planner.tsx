import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Target,
  Users,
  Gauge,
  AlertTriangle,
  Database,
  Lightbulb,
  ListChecks,
  ClipboardList,
  Wrench,
  TrendingUp,
  Scale,
  Info,
} from "lucide-react";

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
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

// Compact INR formatting for on-screen policy figures.
// Exports retain the exact rupee values via formatINR.
function formatINRCompact(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  if (value >= 1_00_00_000) {
    return `₹${(value / 1_00_00_000).toFixed(1)} crore`;
  }
  if (value >= 1_00_000) {
    return `₹${(value / 1_00_000).toFixed(1)} lakh`;
  }
  if (value >= 1_000) {
    return `₹${(value / 1_000).toFixed(1)}k`;
  }
  return `₹${Math.round(value)}`;
}
import { getInterventionPlannerFn } from "@/lib/intervention-planner/planner.functions";
import {
  exportPlannerReport,
  type PlannerReportKind,
} from "@/lib/intervention-planner/reportExporter";
import type {
  CommandAlertPriority,
} from "@/lib/command-center/types";
import type {
  InterventionPlannerSnapshot,
  PlannerIntervention,
} from "@/lib/intervention-planner/types";

export const Route = createFileRoute("/intervention-planner")({
  head: () => ({
    meta: [
      { title: "Welfare Intervention Planner — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Transform welfare insights into evidence-backed, implementation-ready intervention strategies for policymakers, NGOs and CSC operators.",
      },
      {
        property: "og:title",
        content: "Welfare Intervention Planner — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Priority intervention queue, 30/60/90 roadmaps, resource planning and impact forecasts derived from Modules 16–20.",
      },
    ],
  }),
  component: InterventionPlannerPage,
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

function InterventionPlannerPage() {
  const fetcher = useServerFn(getInterventionPlannerFn);
  const { data, isLoading, isError, refetch, isFetching } = useQuery({
    queryKey: ["intervention-planner"],
    queryFn: () => fetcher({ data: {} }),
    staleTime: 60_000,
  });

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8">
        <header className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              to="/command-center"
              className="mb-2 inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="size-3.5" />
              Back to Command Center
            </Link>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Welfare Intervention Planner
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Evidence-backed intervention strategies derived deterministically from Modules
              16–20. Built for policymakers, NGOs and CSC administrators.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => refetch()}
              disabled={isFetching}
            >
              <RefreshCw className={cn("mr-2 size-3.5", isFetching && "animate-spin")} />
              Refresh
            </Button>
          </div>
        </header>

        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : !data.hasSufficientData ? (
          <EmptyState />
        ) : (
          <PlannerBody snap={data} />
        )}
      </div>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 w-full" />
      ))}
      <Skeleton className="col-span-full h-64 w-full" />
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-6 text-sm">
      <p className="font-medium text-destructive">Unable to load planner data.</p>
      <p className="mt-1 text-muted-foreground">
        Try refreshing. Underlying analytics modules may still be initializing.
      </p>
      <Button size="sm" variant="outline" className="mt-3" onClick={onRetry}>
        <RefreshCw className="mr-2 size-3.5" />
        Retry
      </Button>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-lg border bg-muted/30 p-8 text-center text-sm text-muted-foreground">
      <Info className="mx-auto mb-2 size-5 text-muted-foreground" />
      Not enough analytics signal yet to generate intervention recommendations. As more
      households are assessed across modules 1–20, this view will populate automatically.
    </div>
  );
}

function PlannerBody({ snap }: { snap: InterventionPlannerSnapshot }) {
  const [exportKind, setExportKind] = useState<PlannerReportKind>("plan");
  const [compareA, setCompareA] = useState<string>(snap.interventions[0]?.id ?? "");
  const [compareB, setCompareB] = useState<string>(
    snap.interventions[1]?.id ?? snap.interventions[0]?.id ?? "",
  );

  const aggregate = snap.aggregateForecast;
  const ctx = snap.context;
  const ivById = useMemo(
    () => new Map(snap.interventions.map((i) => [i.id, i])),
    [snap.interventions],
  );
  const compareRowA = snap.comparison.find((c) => c.interventionId === compareA);
  const compareRowB = snap.comparison.find((c) => c.interventionId === compareB);

  return (
    <div className="space-y-8">
      {/* Aggregate impact + export */}
      <section className="grid gap-4 lg:grid-cols-4">
        <StatCard
          icon={Users}
          label="Households analyzed"
          value={ctx.householdsAnalyzed.toLocaleString()}
          hint={`${ctx.totalEligibleSchemes} eligible scheme matches`}
        />
        <StatCard
          icon={Gauge}
          label="Opportunity score lift"
          value={`+${aggregate.opportunityScoreLift}`}
          hint={`From ${ctx.averageOpportunityScore}/100 baseline`}
        />
        <StatCard
          icon={TrendingUp}
          label="High-risk reduction"
          value={`-${aggregate.highRiskReductionPct}%`}
          hint={`Currently ${ctx.highRiskPercentage}% high-risk`}
        />
        <StatCard
          icon={Target}
          label="Annual benefits unlocked"
          value={formatINRCompact(aggregate.annualBenefitIncreaseINR)}
          hint={`Welfare readiness +${aggregate.welfareReadinessLift}`}
        />
      </section>

      <section className="flex flex-wrap items-center gap-2 rounded-lg border bg-muted/30 p-3">
        <Download className="size-4 text-muted-foreground" />
        <span className="text-sm font-medium">Export Center</span>
        <Select value={exportKind} onValueChange={(v) => setExportKind(v as PlannerReportKind)}>
          <SelectTrigger className="h-8 w-[220px] text-xs">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="plan">Welfare Intervention Plan</SelectItem>
            <SelectItem value="executive">Executive Action Summary</SelectItem>
            <SelectItem value="stakeholder">Stakeholder Briefing Report</SelectItem>
          </SelectContent>
        </Select>
        <Button size="sm" onClick={() => exportPlannerReport(snap, exportKind)}>
          Print / Save as PDF
        </Button>
        <span className="ml-auto text-xs text-muted-foreground">
          Generated {new Date(snap.generatedAt).toLocaleString()}
        </span>
      </section>

      {/* Priority queue */}
      <section>
        <SectionHeader
          icon={ListChecks}
          title="Priority Intervention Queue"
          subtitle="Ranked deterministically by impact score, expected benefit and priority."
        />
        <div className="grid gap-3">
          {snap.interventions.map((iv) => (
            <InterventionCard
              key={iv.id}
              iv={iv}
              forecast={snap.forecasts.find((f) => f.interventionId === iv.id)}
              resource={snap.resources.find((r) => r.interventionId === iv.id)}
            />
          ))}
        </div>
      </section>

      {/* Roadmaps */}
      <section>
        <SectionHeader
          icon={ClipboardList}
          title="30 · 60 · 90 Day Action Roadmaps"
          subtitle="Structured implementation plan per intervention."
        />
        <div className="space-y-4">
          {snap.interventions.map((iv) => {
            const rm = snap.roadmaps.find((r) => r.interventionId === iv.id);
            if (!rm) return null;
            return (
              <div key={iv.id} className="rounded-lg border bg-card p-4">
                <div className="mb-3 flex items-center justify-between gap-2">
                  <div className="font-semibold">{iv.title}</div>
                  <Badge className={cn("border", PRIORITY_STYLES[iv.priority].badge)}>
                    {PRIORITY_STYLES[iv.priority].label}
                  </Badge>
                </div>
                <div className="grid gap-3 md:grid-cols-3">
                  {rm.phases.map((p) => (
                    <div
                      key={p.window}
                      className="rounded-md border bg-muted/30 p-3 text-xs"
                    >
                      <div className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-primary">
                        {p.window}
                      </div>
                      <div className="mb-2 text-sm font-medium leading-snug">
                        {p.objective}
                      </div>
                      <RoadmapBlock label="Activities" items={p.activities} />
                      <RoadmapBlock label="Stakeholders" items={p.stakeholders} />
                      <RoadmapBlock
                        label="Milestones"
                        items={p.milestones.map((m) => `${m.title} — ${m.detail}`)}
                      />
                      <RoadmapBlock
                        label="Success indicators"
                        items={p.successIndicators}
                      />
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Resource planning */}
      <section>
        <SectionHeader
          icon={Wrench}
          title="Resource Planning Engine"
          subtitle="Operators, camps, sessions and facilitators required per intervention."
        />
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intervention</TableHead>
                <TableHead className="text-right">Estimated CSC support</TableHead>
                <TableHead className="text-right">Documentation drives</TableHead>
                <TableHead className="text-right">Outreach sessions</TableHead>
                <TableHead className="text-right">Navigator facilitators</TableHead>
                <TableHead className="text-right">Priority households</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.resources.map((r) => {
                const iv = ivById.get(r.interventionId);
                if (!iv) return null;
                return (
                  <TableRow key={r.interventionId}>
                    <TableCell className="font-medium">{iv.title}</TableCell>
                    <TableCell className="text-right">~{r.cscOperators}</TableCell>
                    <TableCell className="text-right">~{r.documentationCamps}</TableCell>
                    <TableCell className="text-right">~{r.awarenessSessions}</TableCell>
                    <TableCell className="text-right">~{r.navigatorFacilitators}</TableCell>
                    <TableCell className="text-right">
                      {r.householdsExpectedToBenefit.toLocaleString()}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
        <p className="mt-2 text-[11px] text-muted-foreground">
          Planning estimates are derived deterministically from current analytics and
          automatically scale as additional households are analyzed.
        </p>
      </section>

      {/* Impact Forecast table */}
      <section>
        <SectionHeader
          icon={TrendingUp}
          title="Welfare Impact Forecast"
          subtitle="Projected outcomes if interventions are implemented."
        />
        <div className="overflow-x-auto rounded-lg border bg-card">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Intervention</TableHead>
                <TableHead className="text-right">Opp. score lift</TableHead>
                <TableHead className="text-right">Readiness lift</TableHead>
                <TableHead className="text-right">High-risk ↓</TableHead>
                <TableHead className="text-right">Missed ops ↓</TableHead>
                <TableHead className="text-right">Annual benefit</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {snap.forecasts.map((f) => {
                const iv = ivById.get(f.interventionId);
                if (!iv) return null;
                return (
                  <TableRow key={f.interventionId}>
                    <TableCell className="font-medium">{iv.title}</TableCell>
                    <TableCell className="text-right">+{f.opportunityScoreLift}</TableCell>
                    <TableCell className="text-right">+{f.welfareReadinessLift}</TableCell>
                    <TableCell className="text-right">
                      -{f.highRiskReductionPct}%
                    </TableCell>
                    <TableCell className="text-right">
                      -{f.missedOpportunityReductionPct}%
                    </TableCell>
                    <TableCell className="text-right">
                      {formatINR(f.annualBenefitIncreaseINR)}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </section>

      {/* Explainability */}
      <section>
        <SectionHeader
          icon={Lightbulb}
          title="Intervention Explainability"
          subtitle="Why each intervention was recommended, with datasets, modules, evidence and causal pathway."
        />
        <div className="grid gap-3">
          {snap.explainers.map((ex) => {
            const iv = ivById.get(ex.interventionId);
            if (!iv) return null;
            return (
              <div key={ex.interventionId} className="rounded-lg border bg-card p-4 text-sm">
                <div className="mb-2 font-semibold">{iv.title}</div>
                <p className="text-muted-foreground">{ex.why}</p>
                <p className="mt-2 text-xs">
                  <span className="font-medium">Causal pathway:</span> {ex.causalPathway}
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
                  {ex.modules.map((m) => (
                    <Badge key={m} variant="outline" className="gap-1">
                      <Lightbulb className="size-3" />
                      {m}
                    </Badge>
                  ))}
                  {ex.datasets.map((d) => (
                    <Badge key={d} variant="secondary" className="gap-1">
                      <Database className="size-3" />
                      {d}
                    </Badge>
                  ))}
                </div>
                {ex.evidence.length > 0 ? (
                  <ul className="mt-3 list-disc pl-5 text-xs text-muted-foreground">
                    {ex.evidence.map((e, i) => (
                      <li key={i}>{e}</li>
                    ))}
                  </ul>
                ) : null}
              </div>
            );
          })}
        </div>
      </section>

      {/* Comparison */}
      <section>
        <SectionHeader
          icon={Scale}
          title="Intervention Comparison Dashboard"
          subtitle="Side-by-side trade-offs between two interventions."
        />
        <div className="grid gap-3 sm:grid-cols-2">
          <Select value={compareA} onValueChange={setCompareA}>
            <SelectTrigger>
              <SelectValue placeholder="Intervention A" />
            </SelectTrigger>
            <SelectContent>
              {snap.comparison.map((c) => (
                <SelectItem key={c.interventionId} value={c.interventionId}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={compareB} onValueChange={setCompareB}>
            <SelectTrigger>
              <SelectValue placeholder="Intervention B" />
            </SelectTrigger>
            <SelectContent>
              {snap.comparison.map((c) => (
                <SelectItem key={c.interventionId} value={c.interventionId}>
                  {c.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {compareRowA && compareRowB ? (
          <div className="mt-3 overflow-x-auto rounded-lg border bg-card">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Metric</TableHead>
                  <TableHead>{compareRowA.title}</TableHead>
                  <TableHead>{compareRowB.title}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                <CompareRow
                  label="Impact score"
                  a={`${compareRowA.impactScore}/100`}
                  b={`${compareRowB.impactScore}/100`}
                />
                <CompareRow
                  label="Resource load (relative)"
                  a={`${compareRowA.resourceLoad}/100`}
                  b={`${compareRowB.resourceLoad}/100`}
                />
                <CompareRow
                  label="Time to implement"
                  a={`${compareRowA.timeToImplementWeeks} weeks`}
                  b={`${compareRowB.timeToImplementWeeks} weeks`}
                />
                <CompareRow
                  label="Beneficiary reach"
                  a={compareRowA.beneficiaryReach.toLocaleString()}
                  b={compareRowB.beneficiaryReach.toLocaleString()}
                />
              </TableBody>
            </Table>
          </div>
        ) : null}
      </section>

      {/* Risks */}
      <section>
        <SectionHeader
          icon={AlertTriangle}
          title="Implementation Risk Assessment"
          subtitle="Risks per intervention with concrete mitigation strategies."
        />
        <div className="grid gap-3">
          {snap.risks.map((rk) => {
            const iv = ivById.get(rk.interventionId);
            if (!iv) return null;
            return (
              <div key={rk.interventionId} className="rounded-lg border bg-card p-4">
                <div className="mb-2 font-semibold">{iv.title}</div>
                <ul className="space-y-2 text-sm">
                  {rk.risks.map((r, i) => (
                    <li key={i} className="flex gap-3">
                      <Badge
                        variant="outline"
                        className={cn(
                          "h-fit uppercase",
                          r.severity === "high" &&
                            "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300",
                          r.severity === "medium" &&
                            "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
                          r.severity === "low" &&
                            "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
                        )}
                      >
                        {r.severity}
                      </Badge>
                      <div>
                        <div className="font-medium">{r.risk}</div>
                        <div className="text-xs text-muted-foreground">
                          Mitigation: {r.mitigation}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}

function SectionHeader({
  icon: Icon,
  title,
  subtitle,
}: {
  icon: typeof Target;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-2">
      <Icon className="mt-0.5 size-4 text-primary" />
      <div>
        <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Target;
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1.5 text-2xl font-bold">{value}</div>
      <div className="text-[11px] text-muted-foreground">{hint}</div>
    </div>
  );
}

function InterventionCard({
  iv,
  forecast,
  resource,
}: {
  iv: PlannerIntervention;
  forecast?: InterventionPlannerSnapshot["forecasts"][number];
  resource?: InterventionPlannerSnapshot["resources"][number];
}) {
  const style = PRIORITY_STYLES[iv.priority];
  return (
    <div className={cn("rounded-lg border-l-4 border bg-card p-4", style.ring)}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">{iv.title}</h3>
            <Badge className={cn("border", style.badge)}>{style.label}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{iv.rationale}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Impact score</div>
          <div className="text-2xl font-bold">{iv.impactScore}</div>
        </div>
      </div>
      <div className="mt-3 grid gap-3 text-xs sm:grid-cols-3">
        <div>
          <div className="text-muted-foreground">Population affected</div>
          <div className="text-sm font-medium">
            {iv.populationAffected.toLocaleString()}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Benefits unlocked</div>
          <div className="text-sm font-medium">
            {formatINR(iv.estimatedBenefitUnlockedINR)}
          </div>
        </div>
        <div>
          <div className="text-muted-foreground">Households expected to benefit</div>
          <div className="text-sm font-medium">
            {resource ? resource.householdsExpectedToBenefit.toLocaleString() : "—"}
          </div>
        </div>
      </div>
      <Progress value={iv.impactScore} className="mt-3 h-1.5" />
      {forecast ? (
        <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
          <Badge variant="outline">+{forecast.opportunityScoreLift} opp. score</Badge>
          <Badge variant="outline">+{forecast.welfareReadinessLift} readiness</Badge>
          <Badge variant="outline">-{forecast.highRiskReductionPct}% high-risk</Badge>
          <Badge variant="outline">
            -{forecast.missedOpportunityReductionPct}% missed ops
          </Badge>
          <Badge variant="outline">
            {formatINR(forecast.annualBenefitIncreaseINR)} / yr
          </Badge>
        </div>
      ) : null}
    </div>
  );
}

function RoadmapBlock({ label, items }: { label: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="mt-2">
      <div className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <ul className="mt-0.5 list-disc space-y-0.5 pl-4 text-[11px] leading-snug">
        {items.map((it, i) => (
          <li key={i}>{it}</li>
        ))}
      </ul>
    </div>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <TableRow>
      <TableCell className="text-muted-foreground">{label}</TableCell>
      <TableCell className="font-medium">{a}</TableCell>
      <TableCell className="font-medium">{b}</TableCell>
    </TableRow>
  );
}
