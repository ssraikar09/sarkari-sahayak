import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  BookOpen,
  Database,
  Download,
  FileText,
  Info,
  Layers,
  Microscope,
  Quote,
  ShieldAlert,
  Target,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { getResearchObservatoryFn } from "@/lib/research-observatory/observatory.functions";
import { exportObservatoryReport, type ReportKind } from "@/lib/research-observatory/reportExporter";
import {
  DERIVATION_SOURCES,
  summariseExplainability,
} from "@/lib/research-observatory/explainability";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { ResearchSnapshot } from "@/lib/research-observatory/types";

export const Route = createFileRoute("/research-observatory")({
  head: () => ({
    meta: [
      { title: "Welfare Research Observatory — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Publication-ready welfare research: deterministic archetypes, trend observatory, and evidence-backed findings derived from anonymized platform analytics.",
      },
      { property: "og:title", content: "Welfare Research Observatory — Sarkari Sahayak X" },
      {
        property: "og:description",
        content:
          "Research-grade welfare intelligence with deterministic archetypes, missed-opportunity analysis, and exportable policy briefs.",
      },
    ],
  }),
  component: ObservatoryPage,
});

function ObservatoryPage() {
  const fn = useServerFn(getResearchObservatoryFn);
  const { data, isLoading } = useQuery({
    queryKey: ["research-observatory"],
    queryFn: () => fn({ data: {} }),
    staleTime: 60_000,
  });

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <Header snap={data} />
      {isLoading || !data ? (
        <LoadingState />
      ) : !data.hasSufficientData ? (
        <EmptyState />
      ) : (
        <Content snap={data} />
      )}
    </div>
  );
}

function Header({ snap }: { snap?: ResearchSnapshot }) {
  return (
    <header className="mb-10">
      <Link
        to="/dashboard"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> Back to Dashboard
      </Link>
      <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-[11px] font-bold uppercase tracking-wider text-primary">
        <Microscope className="size-3.5" /> Welfare Research Observatory
      </div>
      <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
        Publication-ready welfare intelligence
      </h1>
      <p className="mt-3 max-w-3xl text-sm text-muted-foreground sm:text-base">
        A research-grade observatory that consolidates anonymized analytics from
        Modules 1–19 into deterministic archetypes, trend concentrations and
        evidence-backed findings — reproducible across refreshes.
      </p>
      {snap ? (
        <div className="mt-4 text-xs text-muted-foreground">
          Last updated · {new Date(snap.generatedAt).toLocaleString()}
        </div>
      ) : null}
    </header>
  );
}

function LoadingState() {
  return (
    <div className="grid gap-4 md:grid-cols-3 lg:grid-cols-6">
      {Array.from({ length: 6 }).map((_, i) => (
        <Skeleton key={i} className="h-28 rounded-2xl" />
      ))}
    </div>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center">
      <Info className="mx-auto size-6 text-muted-foreground" />
      <p className="mt-3 text-sm text-muted-foreground">
        Not enough completed eligibility assessments yet to compose the research
        observatory. Add a few household assessments to populate findings.
      </p>
    </div>
  );
}

function Content({ snap }: { snap: ResearchSnapshot }) {
  return (
    <div className="space-y-12">
      <SnapshotSection snap={snap} />
      <ExportSection snap={snap} />
      <TrendsSection snap={snap} />
      <ArchetypesSection snap={snap} />
      <FindingsSection snap={snap} />
      <ExplainabilitySection snap={snap} />
    </div>
  );
}

/* ---------------- Snapshot ---------------- */

function SnapshotSection({ snap }: { snap: ResearchSnapshot }) {
  const m = snap.metrics;
  const items: { icon: React.ReactNode; label: string; value: string }[] = [
    { icon: <Users className="size-4" />, label: "Households studied", value: String(m.householdsStudied) },
    { icon: <FileText className="size-4" />, label: "Schemes analyzed", value: String(m.schemesAnalyzed) },
    { icon: <Layers className="size-4" />, label: "Goal categories", value: String(m.goalCategoriesCovered) },
    { icon: <ShieldAlert className="size-4" />, label: "High-risk share", value: `${m.highRiskSharePercent}%` },
    { icon: <Target className="size-4" />, label: "Avg opportunity", value: `${m.averageOpportunityScore}/100` },
    { icon: <TrendingUp className="size-4" />, label: "Avg projected benefit", value: formatINR(m.averageProjectedBenefitINR) },
  ];
  return (
    <section>
      <SectionTitle eyebrow="01 · Snapshot" title="Research Snapshot" />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {items.map((it) => (
          <div key={it.label} className="rounded-2xl border bg-card p-5">
            <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              <span className="text-primary">{it.icon}</span>
              {it.label}
            </div>
            <div className="mt-3 text-3xl font-bold leading-none tracking-tight tabular-nums md:text-4xl">
              {it.value}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Export center ---------------- */

function ExportSection({ snap }: { snap: ResearchSnapshot }) {
  const reports: { kind: ReportKind; title: string; desc: string }[] = [
    {
      kind: "executive",
      title: "Executive Summary",
      desc: "Two-page snapshot for senior policymakers — top metrics and headline findings only.",
    },
    {
      kind: "policy-brief",
      title: "Policy Brief",
      desc: "Trend observatory, archetypes and findings sized for working-group briefings.",
    },
    {
      kind: "research-insight",
      title: "Research Insight Report",
      desc: "Full evidence pack with archetypes, datasets and module citations for publication.",
    },
  ];
  return (
    <section>
      <SectionTitle eyebrow="02 · Exports" title="Research Export Center" />
      <div className="grid gap-4 md:grid-cols-3">
        {reports.map((r) => (
          <div key={r.kind} className="flex flex-col rounded-2xl border bg-card p-6">
            <BookOpen className="size-5 text-primary" />
            <h3 className="mt-4 text-base font-semibold tracking-tight">{r.title}</h3>
            <p className="mt-2 flex-1 text-sm text-muted-foreground">{r.desc}</p>
            <Button
              size="sm"
              className="mt-4 w-full"
              onClick={() => exportObservatoryReport(r.kind, snap)}
            >
              <Download className="mr-1.5 size-4" /> Generate PDF
            </Button>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Trends ---------------- */

function TrendsSection({ snap }: { snap: ResearchSnapshot }) {
  const { trends } = snap;
  return (
    <section>
      <SectionTitle eyebrow="03 · Observatory" title="Welfare Trend Observatory" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Panel title="Missed Opportunities by Category">
          <RankedBars
            items={trends.missedByCategory.map((c) => ({
              label: c.category,
              value: c.count,
              suffix: `${c.percent}%`,
              ratio: c.percent / 100,
            }))}
            emptyMessage="No missed-opportunity data yet."
          />
        </Panel>
        <Panel title="Utilization Gaps by Category">
          <RankedBars
            items={trends.utilizationGaps.map((g) => ({
              label: g.category,
              value: g.gapPercent,
              suffix: `${g.explored}/${g.eligible} explored`,
              ratio: g.gapPercent / 100,
              tone: "warning",
            }))}
            emptyMessage="No utilization data yet."
          />
        </Panel>
        <Panel title="Benefit Concentration (Unrealised)">
          <RankedBars
            items={trends.benefitConcentration.map((c) => ({
              label: c.label,
              value: c.value,
              suffix: `${Math.round(c.share * 100)}%`,
              ratio: c.share,
              valueFormatter: (v) => formatINR(v),
            }))}
            emptyMessage="No benefit concentration data yet."
          />
        </Panel>
        <Panel title="Risk Concentration">
          <RankedBars
            items={trends.riskConcentration.map((c) => ({
              label: c.label,
              value: c.value,
              suffix: `${Math.round(c.share * 100)}%`,
              ratio: c.share,
              tone:
                c.label === "High Risk"
                  ? "danger"
                  : c.label === "Moderate Risk"
                    ? "warning"
                    : "success",
            }))}
            emptyMessage="No risk distribution data yet."
          />
        </Panel>
        <Panel title="Navigator Adoption Trend">
          {trends.navigatorAdoption.totalInteractions === 0 ? (
            <p className="text-sm text-muted-foreground">
              No navigator interactions recorded yet.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-3 gap-3">
                <MiniStat
                  label="Adoption"
                  value={`${trends.navigatorAdoption.adoptionPercent}%`}
                />
                <MiniStat
                  label="Engaged"
                  value={String(trends.navigatorAdoption.householdsEngaged)}
                />
                <MiniStat
                  label="Interactions"
                  value={String(trends.navigatorAdoption.totalInteractions)}
                />
              </div>
              {trends.navigatorAdoption.topGoals.length > 0 ? (
                <div className="mt-4">
                  <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                    Top navigator goals
                  </div>
                  <ul className="mt-2 flex flex-wrap gap-1.5">
                    {trends.navigatorAdoption.topGoals.map((g) => (
                      <li
                        key={g.goal}
                        className="rounded-full border bg-background px-2.5 py-0.5 text-xs text-muted-foreground"
                      >
                        {g.goal} · {g.count}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </>
          )}
        </Panel>
      </div>
    </section>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border bg-muted/40 p-3">
      <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-xl font-semibold leading-none tabular-nums">{value}</div>
    </div>
  );
}

type RankedBarItem = {
  label: string;
  value: number;
  suffix?: string;
  ratio: number;
  tone?: "danger" | "warning" | "success" | "neutral";
  valueFormatter?: (v: number) => string;
};

function RankedBars({
  items,
  emptyMessage,
}: {
  items: RankedBarItem[];
  emptyMessage: string;
}) {
  if (!items.length) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>;
  }
  const toneClass = (t?: RankedBarItem["tone"]) =>
    t === "danger"
      ? "bg-destructive"
      : t === "warning"
        ? "bg-amber-500"
        : t === "success"
          ? "bg-emerald-500"
          : "bg-primary";
  return (
    <ul className="space-y-3">
      {items.map((it) => (
        <li key={it.label}>
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium">{it.label}</span>
            <span className="shrink-0 tabular-nums text-muted-foreground">
              {it.valueFormatter ? it.valueFormatter(it.value) : it.value}
              {it.suffix ? ` · ${it.suffix}` : ""}
            </span>
          </div>
          <div className="mt-1.5 h-2 w-full overflow-hidden rounded-full bg-muted">
            <div
              className={toneClass(it.tone)}
              style={{ width: `${Math.max(2, Math.min(100, it.ratio * 100))}%`, height: "100%" }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ---------------- Archetypes ---------------- */

function ArchetypesSection({ snap }: { snap: ResearchSnapshot }) {
  return (
    <section>
      <SectionTitle
        eyebrow="04 · Archetypes"
        title="Household Archetype Engine"
        subtitle="Deterministic segments computed from existing citizen profiles, eligibility assessments and engagement logs."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {snap.archetypes.map((a) => (
          <div key={a.key} className="flex flex-col rounded-2xl border bg-card p-6">
            <div className="flex items-start justify-between gap-3">
              <h3 className="text-base font-semibold tracking-tight">{a.name}</h3>
              <Badge variant="secondary" className="shrink-0">
                {a.households} households
              </Badge>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">{a.description}</p>
            <div className="mt-4 rounded-xl border bg-muted/40 p-3">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Potential benefit pool
              </div>
              <div className="mt-1 text-2xl font-semibold leading-none tabular-nums">
                {formatINR(a.potentialBenefitPoolINR)}
              </div>
            </div>
            <div className="mt-4">
              <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
                Contributing signals
              </div>
              <ul className="mt-2 flex flex-wrap gap-1.5">
                {a.contributingSignals.map((sig) => (
                  <li
                    key={sig}
                    className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                  >
                    {sig}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

/* ---------------- Findings ---------------- */

function FindingsSection({ snap }: { snap: ResearchSnapshot }) {
  return (
    <section>
      <SectionTitle
        eyebrow="05 · Findings"
        title="Research Findings"
        subtitle="Evidence-backed insights generated exclusively from existing module outputs."
      />
      {snap.findings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No findings available yet.</p>
      ) : (
        <ul className="space-y-4">
          {snap.findings.map((f) => (
            <li key={f.id} className="rounded-2xl border bg-card p-6">
              <div className="flex items-start gap-4">
                <div className="grid size-10 shrink-0 place-items-center rounded-xl border bg-primary/10 text-primary">
                  <Quote className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="text-[10px] uppercase tracking-widest">
                      {f.category}
                    </Badge>
                    <Badge className="text-[10px]">{f.magnitude}</Badge>
                    <ConfidenceBadge level={f.confidence} />
                  </div>
                  <h3 className="mt-2 text-base font-semibold tracking-tight">
                    {f.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground">{f.narrative}</p>
                  <div className="mt-3 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2">
                    <div>
                      <span className="font-semibold text-foreground">Contributing modules:</span>{" "}
                      {f.contributingModules.join(" · ")}
                    </div>
                    <div>
                      <span className="font-semibold text-foreground">Datasets:</span>{" "}
                      {f.datasets.join(", ")}
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    <span className="font-semibold text-foreground">Confidence:</span>{" "}
                    {f.confidenceExplanation}
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

/* ---------------- Explainability ---------------- */

function ExplainabilitySection({ snap }: { snap: ResearchSnapshot }) {
  const audit = summariseExplainability(snap);
  return (
    <section>
      <SectionTitle
        eyebrow="06 · Explainability"
        title="Derived From — Methodology & Sources"
        subtitle="Every finding above traces back to these modules and datasets. Refreshes do not alter findings unless underlying analytics change."
      />
      <div className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {DERIVATION_SOURCES.map((s) => (
          <div key={s.module} className="rounded-2xl border bg-card p-5">
            <div className="text-[10px] font-semibold uppercase tracking-widest text-muted-foreground">
              Derived from
            </div>
            <div className="mt-1 text-sm font-semibold tracking-tight">{s.module}</div>
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {s.sources.map((src) => (
                <li
                  key={src}
                  className="rounded-full border bg-background px-2 py-0.5 text-[11px] text-muted-foreground"
                >
                  {src}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Layers className="size-4 text-primary" /> Modules cited by findings
          </div>
          <ul className="mt-3 space-y-1.5 text-sm">
            {audit.modules.map((m) => (
              <li key={m} className="text-muted-foreground">
                · {m}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-2xl border bg-card p-6">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <Database className="size-4 text-primary" /> Datasets cited by findings
          </div>
          <ul className="mt-3 flex flex-wrap gap-1.5">
            {audit.datasets.map((d) => (
              <li
                key={d}
                className="rounded-full border bg-background px-2 py-0.5 text-xs font-mono text-muted-foreground"
              >
                {d}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs text-muted-foreground">
            All metrics are computed deterministically from anonymized platform
            data. Refreshing the page does not change findings unless the
            underlying datasets change.
          </p>
        </div>
      </div>
    </section>
  );
}

function ConfidenceBadge({ level }: { level: "high" | "moderate" | "low" }) {
  const cls =
    level === "high"
      ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-500/30"
      : level === "moderate"
        ? "bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-500/30"
        : "bg-muted text-muted-foreground border-border";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest ${cls}`}
    >
      {level} confidence
    </span>
  );
}

/* ---------------- Shared ---------------- */

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border bg-card p-6">
      <h3 className="text-sm font-semibold tracking-tight">{title}</h3>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function SectionTitle({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mb-5">
      <div className="text-[10px] font-bold uppercase tracking-[0.2em] text-muted-foreground">
        {eyebrow}
      </div>
      <h2 className="mt-1 text-2xl font-bold tracking-tight sm:text-3xl">{title}</h2>
      {subtitle ? (
        <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p>
      ) : null}
    </div>
  );
}

// Silence unused import warning for Progress (kept for future utilisation).
void Progress;
