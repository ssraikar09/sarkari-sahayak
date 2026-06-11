import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  BarChart3,
  BookOpen,
  Compass,
  Download,
  FileText,
  Gauge,
  IndianRupee,
  Info,
  Layers,
  Lightbulb,
  ListChecks,
  MapPin,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { getStoredProfileId } from "@/lib/citizen-profile/storage";
import { getSummaryDownloadCount } from "@/lib/application-guide/summaryGenerator";
import {
  getPersonalImpactFn,
  getHouseholdImpactFn,
} from "@/lib/dashboard/impactService";
import {
  getApplicationProgressFn,
  getAssistantInsightsFn,
} from "@/lib/dashboard/analyticsService";
import type {
  ApplicationProgress,
  AssistantInsights,
  CategoryKey,
  HouseholdImpact,
  PersonalImpact,
} from "@/lib/dashboard/dashboardTypes";
import { getWelfareGapFn } from "@/lib/welfare-gap/gapAnalyzer";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { WelfareGapAnalysis } from "@/lib/welfare-gap/types";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Citizen Impact Dashboard — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "See the welfare opportunities Sarkari Sahayak has identified for you and your household — eligible schemes, family benefits, and assistant insights at a glance.",
      },
      {
        property: "og:title",
        content: "Citizen Impact Dashboard — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Visualize welfare opportunities surfaced by Sarkari Sahayak's verified scheme intelligence.",
      },
    ],
  }),
  component: DashboardPage,
});

function DashboardPage() {
  const personalFn = useServerFn(getPersonalImpactFn);
  const householdFn = useServerFn(getHouseholdImpactFn);
  const assistantFn = useServerFn(getAssistantInsightsFn);
  const progressFn = useServerFn(getApplicationProgressFn);

  const [profileId, setProfileId] = useState<string | null>(null);
  const [downloads, setDownloads] = useState<number>(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProfileId(getStoredProfileId());
    setDownloads(getSummaryDownloadCount());
    setHydrated(true);
  }, []);

  const personal = useQuery({
    queryKey: ["dashboard", "personal", profileId],
    queryFn: () => personalFn({ data: { citizen_profile_id: profileId } }),
    enabled: hydrated,
  });
  const household = useQuery({
    queryKey: ["dashboard", "household", profileId],
    queryFn: () => householdFn({ data: { citizen_profile_id: profileId } }),
    enabled: hydrated,
  });
  const assistant = useQuery({
    queryKey: ["dashboard", "assistant"],
    queryFn: () => assistantFn({ data: {} }),
    enabled: hydrated,
  });
  const progress = useQuery({
    queryKey: ["dashboard", "progress", profileId, downloads],
    queryFn: () =>
      progressFn({
        data: {
          citizen_profile_id: profileId,
          summariesDownloaded: downloads,
        },
      }),
    enabled: hydrated,
  });

  const loading =
    !hydrated ||
    personal.isLoading ||
    household.isLoading ||
    assistant.isLoading ||
    progress.isLoading;

  const error =
    personal.error || household.error || assistant.error || progress.error;

  const isEmpty =
    hydrated &&
    !loading &&
    !error &&
    !profileId &&
    (assistant.data?.totalQueries ?? 0) === 0;

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Module 8 · Citizen Impact
          </Badge>
        </div>

        <header className="mb-6">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            Your Citizen Impact Dashboard
          </h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            A snapshot of welfare opportunities Sarkari Sahayak has identified
            for you and your household, plus how the assistant is being used.
          </p>
        </header>

        {error ? (
          <ErrorState
            message={(error as Error).message || "Could not load dashboard data."}
            onRetry={() => {
              personal.refetch();
              household.refetch();
              assistant.refetch();
              progress.refetch();
            }}
          />
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            <PersonalSection data={personal.data} loading={loading} />
            <HouseholdSection data={household.data} loading={loading} />
            <AssistantSection data={assistant.data} loading={loading} />
            <ProgressSection data={progress.data} loading={loading} />
            <Explainability />
          </div>
        )}
      </div>
    </main>
  );
}

/* -------------------- Sections -------------------- */

function PersonalSection({
  data,
  loading,
}: {
  data: PersonalImpact | undefined;
  loading: boolean;
}) {
  const d =
    data ?? {
      totalEligible: 0,
      national: 0,
      state: 0,
      family: 0,
      byCategory: {} as Record<CategoryKey, number>,
      hasProfile: false,
      hasAssessment: false,
    };

  return (
    <section aria-labelledby="personal-impact">
      <SectionHeader
        id="personal-impact"
        icon={<ShieldCheck className="size-4" />}
        title="Personal Impact Summary"
        subtitle="Eligible schemes identified from your latest assessment."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Total eligible schemes"
          value={d.totalEligible}
          icon={<ListChecks className="size-4" />}
          loading={loading}
        />
        <StatCard
          label="National schemes"
          value={d.national}
          icon={<MapPin className="size-4" />}
          loading={loading}
        />
        <StatCard
          label="State schemes"
          value={d.state}
          icon={<MapPin className="size-4" />}
          loading={loading}
        />
        <StatCard
          label="Family welfare opps."
          value={d.family}
          icon={<Users className="size-4" />}
          loading={loading}
        />
      </div>
      {!loading && !d.hasAssessment ? (
        <p className="mt-3 text-xs text-muted-foreground">
          Run an{" "}
          <Link to="/eligibility" className="text-primary underline-offset-4 hover:underline">
            eligibility check
          </Link>{" "}
          to populate this section.
        </p>
      ) : null}
    </section>
  );
}

function HouseholdSection({
  data,
  loading,
}: {
  data: HouseholdImpact | undefined;
  loading: boolean;
}) {
  const d =
    data ?? {
      familyMemberCount: 0,
      familyRecommendations: 0,
      familyByCategory: {} as Record<CategoryKey, number>,
    };
  return (
    <section aria-labelledby="household-impact">
      <SectionHeader
        id="household-impact"
        icon={<Users className="size-4" />}
        title="Household Impact Summary"
        subtitle="Family members assessed and recommendations across categories."
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="grid grid-cols-2 gap-3">
          <StatCard
            label="Members assessed"
            value={d.familyMemberCount}
            icon={<Users className="size-4" />}
            loading={loading}
          />
          <StatCard
            label="Recommendations"
            value={d.familyRecommendations}
            icon={<ListChecks className="size-4" />}
            loading={loading}
          />
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm">
          <h3 className="text-sm font-semibold text-foreground">By category</h3>
          <p className="text-xs text-muted-foreground">
            Breakdown of recommended schemes across welfare segments.
          </p>
          <div className="mt-3">
            <CategoryBars
              loading={loading}
              counts={d.familyByCategory as Record<CategoryKey, number>}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function AssistantSection({
  data,
  loading,
}: {
  data: AssistantInsights | undefined;
  loading: boolean;
}) {
  const d =
    data ?? { totalQueries: 0, topCategories: [], topSchemes: [] };
  return (
    <section aria-labelledby="assistant-insights">
      <SectionHeader
        id="assistant-insights"
        icon={<MessageCircle className="size-4" />}
        title="Assistant Insights"
        subtitle="How citizens are using Sarkari Sahayak's AI assistant."
      />
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          label="Total assistant queries"
          value={d.totalQueries}
          icon={<MessageCircle className="size-4" />}
          loading={loading}
        />
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:col-span-1">
          <h3 className="text-sm font-semibold text-foreground">
            Most searched categories
          </h3>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
              <Skeleton className="h-3 w-3/5" />
            </div>
          ) : d.topCategories.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No category trends yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {d.topCategories.map((c) => {
                const max = d.topCategories[0]?.count || 1;
                const pct = Math.round((c.count / max) * 100);
                return (
                  <li key={c.category} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-foreground">{c.category}</span>
                      <span className="text-muted-foreground">{c.count}</span>
                    </div>
                    <Progress value={pct} className="h-1.5" />
                  </li>
                );
              })}
            </ul>
          )}
        </div>
        <div className="rounded-2xl border bg-card p-4 shadow-sm sm:col-span-1">
          <h3 className="text-sm font-semibold text-foreground">
            Most viewed schemes
          </h3>
          {loading ? (
            <div className="mt-3 space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          ) : d.topSchemes.length === 0 ? (
            <p className="mt-3 text-xs text-muted-foreground">
              No scheme retrievals yet.
            </p>
          ) : (
            <ul className="mt-3 space-y-1.5">
              {d.topSchemes.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-2 text-xs"
                >
                  <Link
                    to="/schemes/$id"
                    params={{ id: s.id }}
                    className="truncate font-medium text-foreground hover:text-primary"
                  >
                    {s.name}
                  </Link>
                  <Badge variant="secondary" className="shrink-0 px-2 py-0 text-[10px]">
                    {s.count}
                  </Badge>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}

function ProgressSection({
  data,
  loading,
}: {
  data: ApplicationProgress | undefined;
  loading: boolean;
}) {
  const d = data ?? { guidesOpened: 0, summariesDownloaded: 0 };
  return (
    <section aria-labelledby="application-progress">
      <SectionHeader
        id="application-progress"
        icon={<BarChart3 className="size-4" />}
        title="Application Progress"
        subtitle="Guides explored and summaries downloaded for follow-through."
      />
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard
          label="Guides opened"
          value={d.guidesOpened}
          icon={<BookOpen className="size-4" />}
          loading={loading}
        />
        <StatCard
          label="Summaries downloaded"
          value={d.summariesDownloaded}
          icon={<Download className="size-4" />}
          loading={loading}
        />
      </div>
    </section>
  );
}

function Explainability() {
  return (
    <section className="rounded-2xl border bg-card/60 p-4 shadow-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <ShieldCheck className="size-4" />
        </div>
        <div>
          <h3 className="text-sm font-semibold text-foreground">
            Explainable & verified
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            These recommendations are generated using verified government
            schemes and explainable eligibility logic.
          </p>
        </div>
      </div>
    </section>
  );
}

/* -------------------- Building blocks -------------------- */

function SectionHeader({
  id,
  icon,
  title,
  subtitle,
}: {
  id: string;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="mb-3 flex items-start gap-3">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <div>
        <h2 id={id} className="text-lg font-semibold text-foreground">
          {title}
        </h2>
        <p className="text-xs text-muted-foreground">{subtitle}</p>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon,
  loading,
}: {
  label: string;
  value: number;
  icon: React.ReactNode;
  loading?: boolean;
}) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-sm">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <span className="text-muted-foreground">{icon}</span>
      </div>
      <div className="mt-2 text-2xl font-bold tracking-tight text-foreground">
        {loading ? <Skeleton className="h-7 w-12" /> : value.toLocaleString()}
      </div>
    </div>
  );
}

const CATEGORY_ORDER: CategoryKey[] = [
  "Farmer",
  "Women",
  "Student",
  "Senior Citizen",
  "Entrepreneur",
  "Health & Social Security",
  "Other",
];

function CategoryBars({
  counts,
  loading,
}: {
  counts: Record<CategoryKey, number>;
  loading: boolean;
}) {
  if (loading) {
    return (
      <div className="space-y-2">
        {CATEGORY_ORDER.slice(0, 5).map((k) => (
          <Skeleton key={k} className="h-3 w-full" />
        ))}
      </div>
    );
  }
  const values = CATEGORY_ORDER.map((k) => ({ key: k, count: counts[k] ?? 0 }));
  const max = Math.max(1, ...values.map((v) => v.count));
  const anyData = values.some((v) => v.count > 0);
  if (!anyData) {
    return (
      <p className="text-xs text-muted-foreground">
        Run an eligibility check to see your household breakdown.
      </p>
    );
  }
  return (
    <ul className="space-y-2">
      {values.map((v) => {
        const pct = Math.round((v.count / max) * 100);
        return (
          <li key={v.key} className="space-y-1">
            <div className="flex items-center justify-between text-xs">
              <span className="text-foreground">{v.key}</span>
              <span className="text-muted-foreground">{v.count}</span>
            </div>
            <div
              className={cn(
                "h-2 w-full overflow-hidden rounded-full bg-accent",
              )}
            >
              <div
                className="h-full rounded-full bg-primary transition-[width]"
                style={{ width: `${pct}%` }}
                aria-hidden
              />
            </div>
          </li>
        );
      })}
    </ul>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-primary/10 text-primary">
        <Compass className="size-7" aria-hidden />
      </div>
      <h2 className="mt-4 text-lg font-semibold text-foreground">
        Nothing to show yet
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        Use Sarkari Sahayak to discover your welfare opportunities.
      </p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        <Button asChild>
          <Link to="/onboarding">
            <Sparkles className="mr-1 size-4" />
            Create profile
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link to="/eligibility">
            <ListChecks className="mr-1 size-4" />
            Check eligibility
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/assistant">
            <MessageCircle className="mr-1 size-4" />
            Ask the assistant
          </Link>
        </Button>
        <Button asChild variant="outline">
          <Link to="/schemes">
            <Layers className="mr-1 size-4" />
            Browse schemes
          </Link>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
      <FileText className="mx-auto size-8 text-muted-foreground" aria-hidden />
      <h2 className="mt-3 text-base font-semibold text-foreground">
        Could not load your dashboard
      </h2>
      <p className="mx-auto mt-1 max-w-md text-sm text-muted-foreground">
        {message}
      </p>
      <div className="mt-4">
        <Button onClick={onRetry} size="sm">
          Try again
        </Button>
      </div>
    </div>
  );
}
