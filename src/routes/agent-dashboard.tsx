import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  ClipboardList,
  Download,
  FileText,
  Gauge,
  Info,
  Search,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { getAgentSnapshotFn } from "@/lib/agent-dashboard/agentAnalytics";
import { listAssistedCitizensFn } from "@/lib/agent-dashboard/citizenRegistry";
import { exportAgentReport } from "@/lib/agent-dashboard/reportGenerator";
import {
  APPLICATION_STATUSES,
  getStatusOverride,
  setStatusOverride,
} from "@/lib/agent-dashboard/workflowTracker";
import type {
  ApplicationStatus,
  CitizenAssistanceRow,
} from "@/lib/agent-dashboard/types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export const Route = createFileRoute("/agent-dashboard")({
  head: () => ({
    meta: [
      { title: "CSC Agent Dashboard — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Common Service Center operator dashboard to assist citizens at scale with welfare schemes.",
      },
      {
        property: "og:title",
        content: "CSC Agent Dashboard — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Manage households, eligibility assessments, and welfare action plans from one place.",
      },
    ],
  }),
  component: AgentDashboard,
});

function AgentDashboard() {
  const snapshotFn = useServerFn(getAgentSnapshotFn);
  const listFn = useServerFn(listAssistedCitizensFn);
  const [search, setSearch] = useState("");

  const snapshotQ = useQuery({
    queryKey: ["agent-snapshot"],
    queryFn: () => snapshotFn(),
  });
  const citizensQ = useQuery({
    queryKey: ["agent-citizens", search.trim()],
    queryFn: () => listFn({ data: { search: search.trim() } }),
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
        </div>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card px-3 py-1 text-xs text-muted-foreground">
            <Users className="size-3.5" />
            Module 12 · CSC Agent Dashboard
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            CSC Agent Dashboard
          </h1>
          <p className="mt-2 text-muted-foreground">
            Assist multiple citizens across welfare schemes from a single
            workspace.
          </p>
        </header>

        <div className="mb-6 flex items-start gap-2 rounded-lg border bg-primary/5 p-3 text-sm text-muted-foreground">
          <Info className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>
            All recommendations are generated using verified government schemes
            and explainable eligibility logic.
          </p>
        </div>

        {snapshotQ.isLoading ? (
          <OverviewSkeleton />
        ) : snapshotQ.isError || !snapshotQ.data ? (
          <ErrorBlock onRetry={() => snapshotQ.refetch()} />
        ) : (
          <OverviewSection snap={snapshotQ.data} />
        )}

        <section className="mt-10">
          <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <h2 className="text-lg font-semibold">Citizen Registry</h2>
            <div className="relative w-full sm:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or profile ID…"
                className="h-11 pl-9 text-base"
                aria-label="Search citizens"
              />
            </div>
          </div>

          {citizensQ.isLoading ? (
            <div className="space-y-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-40 rounded-xl" />
              ))}
            </div>
          ) : citizensQ.isError ? (
            <ErrorBlock onRetry={() => citizensQ.refetch()} />
          ) : !citizensQ.data || citizensQ.data.length === 0 ? (
            <EmptyState hasSearch={!!search.trim()} />
          ) : (
            <div className="space-y-4">
              {citizensQ.data.map((row) => (
                <CitizenCard key={row.citizen.id} row={row} />
              ))}
            </div>
          )}
        </section>

        {snapshotQ.data ? (
          <AnalyticsSection snap={snapshotQ.data} />
        ) : null}
      </div>
    </main>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Skeleton key={i} className="h-24 rounded-xl" />
      ))}
    </div>
  );
}

function OverviewSection({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getAgentSnapshotFn>>;
}) {
  const { overview } = snap;
  return (
    <section>
      <h2 className="mb-3 text-lg font-semibold">Agent Overview</h2>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Stat
          icon={<Users className="size-4" />}
          label="Citizens Assisted"
          value={String(overview.totalCitizensAssisted)}
        />
        <Stat
          icon={<Users className="size-4" />}
          label="Households Managed"
          value={String(overview.totalHouseholdsManaged)}
        />
        <Stat
          icon={<ClipboardList className="size-4" />}
          label="Eligibility Assessments"
          value={String(overview.totalEligibilityAssessments)}
        />
        <Stat
          icon={<FileText className="size-4" />}
          label="Application Guides"
          value={String(overview.totalGuidesGenerated)}
        />
        <Stat
          icon={<BarChart3 className="size-4" />}
          label="Navigator Plans"
          value={String(overview.totalNavigatorPlans)}
        />
      </div>
    </section>
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
    <div className="rounded-2xl border bg-card p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <span className="text-primary">{icon}</span>
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight">{value}</div>
    </div>
  );
}

function CitizenCard({ row }: { row: CitizenAssistanceRow }) {
  const { citizen, household, workflow } = row;
  const initialStatus = useMemo<ApplicationStatus>(
    () => getStatusOverride(citizen.id) ?? workflow.applicationStatus,
    [citizen.id, workflow.applicationStatus],
  );
  const [status, setStatus] = useState<ApplicationStatus>(initialStatus);

  const onStatusChange = (next: string) => {
    const v = next as ApplicationStatus;
    setStatus(v);
    setStatusOverride(citizen.id, v);
  };

  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h3 className="text-base font-semibold">{citizen.fullName}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {citizen.age} yrs · {citizen.occupation} · {citizen.district},{" "}
            {citizen.state}
          </p>
          <p className="mt-1 text-[11px] text-muted-foreground/80">
            Profile ID: <span className="font-mono">{citizen.id}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RiskBadge risk={household.riskCategory} />
          <Badge variant="secondary">
            <Gauge className="mr-1 size-3" />
            {household.opportunityScore}/100
          </Badge>
          <Button asChild size="sm" variant="outline">
            <Link to="/dashboard">
              Open Dashboard
              <ArrowRight className="ml-1 size-3.5" />
            </Link>
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Missed Opportunities" value={String(household.missedOpportunities)} />
        <MiniStat
          label="Est. Annual Benefit"
          value={formatINR(household.estimatedAnnualBenefitINR)}
        />
        <MiniStat label="Guides Opened" value={String(workflow.guidesOpened)} />
        <MiniStat
          label="Navigator Plans"
          value={String(workflow.navigatorPlansGenerated)}
        />
      </div>

      <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Application status</span>
          <Select value={status} onValueChange={onStatusChange}>
            <SelectTrigger className="h-9 w-44" aria-label="Application status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APPLICATION_STATUSES.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportAgentReport("household", row)}
          >
            <Download className="mr-1 size-3.5" />
            Household Report
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportAgentReport("eligibility", row)}
          >
            <Download className="mr-1 size-3.5" />
            Eligibility Report
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => exportAgentReport("navigator", row)}
          >
            <Download className="mr-1 size-3.5" />
            Navigator Plan
          </Button>
        </div>
      </div>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border bg-background/60 p-3">
      <div className="text-[11px] uppercase tracking-wide text-muted-foreground">
        {label}
      </div>
      <div className="mt-1 text-sm font-semibold">{value}</div>
    </div>
  );
}

function RiskBadge({ risk }: { risk: "High" | "Moderate" | "Low" }) {
  const map = {
    High: "bg-destructive text-destructive-foreground",
    Moderate: "bg-amber-500 text-white",
    Low: "bg-emerald-500 text-white",
  } as const;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[risk]}`}
    >
      {risk} Risk
    </span>
  );
}

function AnalyticsSection({
  snap,
}: {
  snap: Awaited<ReturnType<typeof getAgentSnapshotFn>>;
}) {
  const { analytics } = snap;
  return (
    <section className="mt-10">
      <h2 className="mb-3 text-lg font-semibold">Agent Analytics</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        <RankCard
          title="Most Common Citizen Goals"
          items={analytics.topGoals.map((g) => ({ label: g.goal, count: g.count }))}
        />
        <RankCard
          title="Most Recommended Scheme Categories"
          items={analytics.topRecommendedCategories.map((c) => ({
            label: c.category,
            count: c.count,
          }))}
        />
        <Stat
          icon={<Gauge className="size-4" />}
          label="Average Welfare Opportunity Score"
          value={`${analytics.averageOpportunityScore} / 100`}
        />
        <Stat
          icon={<BarChart3 className="size-4" />}
          label="Average Annual Benefit Estimate"
          value={formatINR(analytics.averageAnnualBenefitINR)}
        />
      </div>
    </section>
  );
}

function RankCard({
  title,
  items,
}: {
  title: string;
  items: { label: string; count: number }[];
}) {
  return (
    <div className="rounded-2xl border bg-card p-4">
      <h3 className="text-sm font-semibold text-foreground">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Insights will appear here once citizens are assisted.
        </p>
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

function ErrorBlock({ onRetry }: { onRetry: () => void }) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center">
      <p className="text-sm text-muted-foreground">
        Could not load agent data right now.
      </p>
      <Button className="mt-3" size="sm" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="rounded-2xl border bg-card p-10 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">
        {hasSearch ? "No matching citizens" : "No assisted citizens available yet."}
      </h3>
      <p className="mx-auto mt-2 max-w-md text-sm text-muted-foreground">
        {hasSearch
          ? "Try a different name or paste a full Profile ID."
          : "Onboard a citizen or open the scheme explorer to start assisting households."}
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/onboarding">Create Citizen Profile</Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/schemes">Browse Schemes</Link>
        </Button>
      </div>
    </div>
  );
}
