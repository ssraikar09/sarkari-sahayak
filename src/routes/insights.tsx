import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Gauge,
  Info,
  Layers,
  ShieldCheck,
  Target,
  TrendingUp,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { getInsightsSnapshotFn } from "@/lib/insights/analyticsEngine";
import { generateInsightsSummary } from "@/lib/insights/researchGenerator";
import { exportInsightsToPdf } from "@/lib/insights/exportService";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  InsightsSnapshot,
  RiskDistribution,
  SchemeCount,
} from "@/lib/insights/types";

export const Route = createFileRoute("/insights")({
  head: () => ({
    meta: [
      { title: "Welfare Research Insights — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Research-grade welfare analytics generated from anonymized citizen interactions and verified scheme recommendations.",
      },
      {
        property: "og:title",
        content: "Welfare Research Insights — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Aggregate welfare trends, household statistics, scheme utilization, and risk distribution.",
      },
    ],
  }),
  component: InsightsPage,
});

function InsightsPage() {
  const insightsFn = useServerFn(getInsightsSnapshotFn);
  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ["insights-snapshot"],
    queryFn: () => insightsFn(),
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <Button
            size="sm"
            onClick={() => data && exportInsightsToPdf(data)}
            disabled={!data}
          >
            <Download className="mr-1 size-4" />
            Export PDF
          </Button>
        </div>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            Module 11 · Welfare Research Insights
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Welfare Research Insights
          </h1>
          <p className="mt-2 text-muted-foreground">
            Research-grade analytics derived from citizen interactions across
            Sarkari Sahayak.
          </p>
        </header>

        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            All analytics are generated from anonymized user interactions and
            verified welfare recommendations.
          </p>
        </div>

        {isLoading ? (
          <LoadingState />
        ) : isError || !data ? (
          <ErrorState onRetry={() => refetch()} />
        ) : (
          <Content snap={data} />
        )}
      </div>
    </main>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-xl border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load research insights right now.
      </p>
      <Button className="mt-3" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function Content({ snap }: { snap: InsightsSnapshot }) {
  const summary = generateInsightsSummary(snap);
  return (
    <div className="space-y-8">
      {/* Household stats */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Household Welfare Statistics</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Stat
            icon={<Gauge className="size-4" />}
            label="Avg Opportunity Score"
            value={`${snap.household.averageOpportunityScore} / 100`}
          />
          <Stat
            icon={<Target className="size-4" />}
            label="Avg Missed Opportunities"
            value={String(snap.household.averageMissedOpportunities)}
          />
          <Stat
            icon={<BarChart3 className="size-4" />}
            label="Avg Annual Benefits"
            value={formatINR(snap.household.averageEstimatedAnnualBenefits)}
          />
          <Stat
            icon={<Layers className="size-4" />}
            label="Households Analyzed"
            value={String(snap.household.profilesAnalyzed)}
          />
        </div>
      </section>

      {/* Trends */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Welfare Trends</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <RankCard
            title="Most Searched Categories"
            items={snap.trends.searchedCategories.map((c) => ({
              label: c.category,
              count: c.count,
            }))}
            emptyMessage="Search activity insights will appear here once citizens explore schemes."
          />
          <RankCard
            title="Most Recommended Categories"
            items={snap.trends.recommendedCategories.map((c) => ({
              label: c.category,
              count: c.count,
            }))}
          />
          <RankCard
            title="Most Explored Application Guides"
            items={snap.trends.topGuides.map((s) => ({
              label: s.name,
              count: s.count,
            }))}
          />
          <RankCard
            title="Most Used Navigator Goals"
            items={snap.trends.navigatorGoals.map((g) => ({
              label: g.goal,
              count: g.count,
            }))}
          />
        </div>
      </section>

      {/* Utilization */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Scheme Utilization</h2>
        <div className="grid gap-3 sm:grid-cols-3">
          <SchemeRank title="Top Viewed Schemes" items={snap.utilization.topViewedSchemes} />
          <SchemeRank
            title="Top Downloaded Summaries"
            items={snap.utilization.topDownloadedSummaries}
          />
          <SchemeRank
            title="Top Welfare Action Plans"
            items={snap.utilization.topActionPlanSchemes}
          />
        </div>
      </section>

      {/* Risk distribution */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Welfare Risk Distribution</h2>
        <RiskBar risk={snap.risk} />
      </section>

      {/* Summary */}
      <section>
        <h2 className="mb-3 text-lg font-semibold">Insights Summary</h2>
        <div className="rounded-xl border bg-card p-4">
          {summary.length === 0 ? (
            <p className="text-sm text-muted-foreground">No insights available yet.</p>
          ) : (
            <ul className="list-disc space-y-1.5 pl-5 text-sm text-foreground">
              {summary.map((line, i) => (
                <li key={i}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function RankCard({
  title,
  items,
  emptyMessage = "No data yet.",
}: {
  title: string;
  items: { label: string; count: number }[];
  emptyMessage?: string;
}) {
  return (
    <div className="rounded-xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">{emptyMessage}</p>
      ) : (
        <ol className="mt-3 space-y-1.5 text-sm">
          {items.map((i, idx) => (
            <li
              key={`${i.label}-${idx}`}
              className="flex items-center justify-between gap-2"
            >
              <span className="truncate">
                <span className="mr-2 text-muted-foreground">{idx + 1}.</span>
                {i.label}
              </span>
              <Badge variant="secondary">{i.count}</Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function SchemeRank({ title, items }: { title: string; items: SchemeCount[] }) {
  return (
    <RankCard
      title={title}
      items={items.map((s) => ({ label: s.name, count: s.count }))}
    />
  );
}

function RiskBar({ risk }: { risk: RiskDistribution }) {
  const total = Math.max(1, risk.total);
  const pct = (n: number) => Math.round((n / total) * 100);
  const segments = [
    { key: "high", label: "High Risk", count: risk.high, cls: "bg-destructive" },
    { key: "moderate", label: "Moderate Risk", count: risk.moderate, cls: "bg-amber-500" },
    { key: "low", label: "Low Risk", count: risk.low, cls: "bg-emerald-500" },
  ];
  return (
    <div className="rounded-xl border bg-card p-4">
      {risk.total === 0 ? (
        <p className="text-sm text-muted-foreground">
          No household assessments yet to compute risk distribution.
        </p>
      ) : (
        <>
          <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
            {segments.map((s) => (
              <div
                key={s.key}
                className={s.cls}
                style={{ width: `${pct(s.count)}%` }}
                aria-label={`${s.label} ${pct(s.count)}%`}
              />
            ))}
          </div>
          <div className="mt-3 grid gap-2 sm:grid-cols-3">
            {segments.map((s) => (
              <div key={s.key} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2">
                  <span className={`inline-block size-2 rounded-full ${s.cls}`} />
                  {s.label}
                </span>
                <span className="text-muted-foreground">
                  {s.count} ({pct(s.count)}%)
                </span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Based on {risk.total} household{risk.total === 1 ? "" : "s"} with completed
            eligibility assessments.
          </div>
        </>
      )}
    </div>
  );
}
