import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  BarChart3,
  Download,
  Gauge,
  Info,
  Layers,
  Lightbulb,
  MapPin,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
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
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
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

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <TrendingUp className="size-3.5" />
            Module 16 · Policy Intelligence Engine
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Policy Intelligence Engine
          </h1>
          <p className="mt-2 text-muted-foreground">
            Identify welfare delivery gaps, explainable recommendations, and
            evidence-based regional insights.
          </p>
        </header>

        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            Insights are generated using anonymized citizen interactions,
            verified welfare recommendations, and explainable aggregation logic.
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

function LoadingState() {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-xl" />
      ))}
    </div>
  );
}

function ErrorState({ onRetry, loading }: { onRetry: () => void; loading: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
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
    <div className="rounded-2xl border bg-card p-8 text-center">
      <Lightbulb className="mx-auto size-8 text-primary" />
      <h2 className="mt-3 text-lg font-semibold">More data needed</h2>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        Additional citizen interactions are required to generate policy
        intelligence insights.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-2">
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
    <div className="space-y-10">
      <Overview snap={snap} />
      <Exclusion snap={snap} />
      <Regional snap={snap} />
      <Recommendations snap={snap} />
      <Trends snap={snap} />
      <Heatmap risk={snap.regional.risk} />
    </div>
  );
}

function Overview({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const o = snap.overview;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">National Welfare Gap Dashboard</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat icon={<Gauge className="size-4" />} label="Avg Opportunity Score" value={`${o.averageOpportunityScore}/100`} />
        <Stat icon={<Target className="size-4" />} label="Avg Missed Opportunities" value={String(o.averageMissedOpportunities)} />
        <Stat icon={<BarChart3 className="size-4" />} label="Avg Annual Benefits" value={formatINR(o.averageEstimatedAnnualBenefitsINR)} />
        <Stat icon={<Layers className="size-4" />} label="Households Analyzed" value={String(o.householdsAnalyzed)} />
        <Stat icon={<ShieldAlert className="size-4" />} label="High-Risk Households" value={`${o.highRiskPercentage}%`} />
      </div>
    </section>
  );
}

function Exclusion({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const e = snap.exclusion;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Welfare Exclusion Analysis</h2>
      <div className="grid gap-3 lg:grid-cols-3">
        <Card title="Highest Missed Categories" icon={<Target className="size-4" />}>
          {e.topMissedCategories.length === 0 ? (
            <Empty />
          ) : (
            <ol className="space-y-1.5 text-sm">
              {e.topMissedCategories.map((c, i) => (
                <li key={c.category} className="flex justify-between gap-2">
                  <span className="truncate"><span className="mr-2 text-muted-foreground">{i + 1}.</span>{c.category}</span>
                  <Badge variant="secondary">{c.count}</Badge>
                </li>
              ))}
            </ol>
          )}
        </Card>
        <Card title="Most Underutilized Schemes" icon={<BarChart3 className="size-4" />}>
          {e.underutilizedSchemes.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2 text-sm">
              {e.underutilizedSchemes.map((s) => (
                <li key={s.id}>
                  <div className="font-medium truncate">{s.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {s.category} · {s.eligibleCount} eligible · {Math.round(s.utilizationRate * 100)}% utilization
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
        <Card title="Underserved Beneficiary Groups" icon={<Users className="size-4" />}>
          {e.underservedGroups.length === 0 ? (
            <Empty />
          ) : (
            <ul className="space-y-2 text-sm">
              {e.underservedGroups.map((g) => (
                <li key={g.group}>
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{g.group}</span>
                    <Badge variant={g.averageOpportunityScore < 40 ? "destructive" : "secondary"}>
                      {g.averageOpportunityScore}/100
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {g.affectedHouseholds} households · avg {g.averageMissed} missed
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </section>
  );
}

function Regional({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Regional Policy Intelligence</h2>
      <div className="grid gap-3 lg:grid-cols-2">
        <Card title="State-wise Demand" icon={<MapPin className="size-4" />}>
          {snap.regional.demand.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-1.5 pr-2">State</th><th className="pr-2">Top Category</th><th className="pr-2">Top Goal</th><th>Interactions</th></tr>
                </thead>
                <tbody>
                  {snap.regional.demand.map((r) => (
                    <tr key={r.state} className="border-t">
                      <td className="py-1.5 pr-2 font-medium">{r.state}</td>
                      <td className="pr-2">{r.topCategory}</td>
                      <td className="pr-2">{r.topGoal}</td>
                      <td>{r.totalInteractions}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
        <Card title="State-wise Welfare Risk" icon={<ShieldAlert className="size-4" />}>
          {snap.regional.risk.length === 0 ? (
            <Empty />
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-muted-foreground">
                  <tr><th className="py-1.5 pr-2">State</th><th className="pr-2">Households</th><th className="pr-2">Avg Score</th><th>Risk</th></tr>
                </thead>
                <tbody>
                  {snap.regional.risk.map((r) => (
                    <tr key={r.state} className="border-t">
                      <td className="py-1.5 pr-2 font-medium">{r.state}</td>
                      <td className="pr-2">{r.households}</td>
                      <td className="pr-2">{r.averageOpportunityScore}/100</td>
                      <td className="text-xs text-muted-foreground">H {r.high} · M {r.moderate} · L {r.low}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </section>
  );
}

function Recommendations({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Explainable Policy Recommendations</h2>
      {snap.recommendations.length === 0 ? (
        <div className="rounded-2xl border bg-card p-4 text-sm text-muted-foreground">
          No recommendations available yet — more data is needed.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {snap.recommendations.map((r) => (
            <div key={r.id} className="rounded-2xl border bg-card p-4">
              <div className="flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold">{r.title}</h3>
                <Badge variant={r.priority === "high" ? "destructive" : r.priority === "medium" ? "default" : "secondary"}>
                  {r.priority}
                </Badge>
              </div>
              <p className="mt-1.5 text-sm text-muted-foreground">{r.rationale}</p>
              <div className="mt-2 text-xs font-medium text-foreground">Evidence</div>
              <ul className="mt-1 list-disc pl-5 text-xs text-muted-foreground">
                {r.evidence.map((e, i) => (<li key={i}>{e}</li>))}
              </ul>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {r.sources.map((s) => (
                  <span key={s} className="rounded-full bg-accent px-2 py-0.5 text-[10px] text-foreground/70">
                    {s}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Trends({ snap }: { snap: PolicyIntelligenceSnapshot }) {
  const t = snap.trends;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Welfare Trend Analysis</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <RankCard title="Common Navigator Goals" items={t.navigatorGoals.map((g) => ({ label: g.goal, count: g.count }))} />
        <RankCard title="Recommended Categories" items={t.recommendedCategories.map((c) => ({ label: c.category, count: c.count }))} />
        <RankCard title="Top Action Plans" items={t.topDownloadedReports.map((s) => ({ label: s.name, count: s.count }))} />
        <RankCard title="Explored Guides" items={t.topExploredGuides.map((s) => ({ label: s.name, count: s.count }))} />
      </div>
    </section>
  );
}

function Heatmap({ risk }: { risk: StateRiskRow[] }) {
  const states = useMemo(() => ["All states", ...risk.map((r) => r.state)], [risk]);
  const [filter, setFilter] = useState("All states");
  const filtered = filter === "All states" ? risk : risk.filter((r) => r.state === filter);
  const totals = filtered.reduce(
    (acc, r) => ({ high: acc.high + r.high, moderate: acc.moderate + r.moderate, low: acc.low + r.low }),
    { high: 0, moderate: 0, low: 0 },
  );
  const total = Math.max(1, totals.high + totals.moderate + totals.low);
  const pct = (n: number) => Math.round((n / total) * 100);

  return (
    <section>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-lg font-semibold">Policy Risk Heatmap</h2>
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="h-9 w-[200px]"><SelectValue /></SelectTrigger>
          <SelectContent>
            {states.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
          </SelectContent>
        </Select>
      </div>
      <div className="rounded-2xl border bg-card p-4">
        {totals.high + totals.moderate + totals.low === 0 ? (
          <Empty />
        ) : (
          <>
            <div className="flex h-3 w-full overflow-hidden rounded-full bg-muted">
              <div className="bg-destructive" style={{ width: `${pct(totals.high)}%` }} />
              <div className="bg-amber-500" style={{ width: `${pct(totals.moderate)}%` }} />
              <div className="bg-emerald-500" style={{ width: `${pct(totals.low)}%` }} />
            </div>
            <div className="mt-3 grid gap-2 sm:grid-cols-3 text-sm">
              <Legend cls="bg-destructive" label="High Risk" count={totals.high} pct={pct(totals.high)} />
              <Legend cls="bg-amber-500" label="Moderate Risk" count={totals.moderate} pct={pct(totals.moderate)} />
              <Legend cls="bg-emerald-500" label="Low Risk" count={totals.low} pct={pct(totals.low)} />
            </div>
          </>
        )}
      </div>
    </section>
  );
}

function Legend({ cls, label, count, pct }: { cls: string; label: string; count: number; pct: number }) {
  return (
    <div className="flex items-center justify-between">
      <span className="flex items-center gap-2"><span className={`inline-block size-2 rounded-full ${cls}`} />{label}</span>
      <span className="text-muted-foreground">{count} ({pct}%)</span>
    </div>
  );
}

function Stat({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>{label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function Card({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold">
        <span className="text-primary">{icon}</span>{title}
      </div>
      {children}
    </div>
  );
}

function RankCard({ title, items }: { title: string; items: { label: string; count: number }[] }) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">No data yet.</p>
      ) : (
        <ol className="mt-3 space-y-1.5 text-sm">
          {items.map((i, idx) => (
            <li key={`${i.label}-${idx}`} className="flex items-center justify-between gap-2">
              <span className="truncate"><span className="mr-2 text-muted-foreground">{idx + 1}.</span>{i.label}</span>
              <Badge variant="secondary">{i.count}</Badge>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

function Empty() {
  return <p className="text-xs text-muted-foreground">No data yet.</p>;
}
