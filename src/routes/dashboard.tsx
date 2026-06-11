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
  const welfareGapFn = useServerFn(getWelfareGapFn);

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
  const welfareGap = useQuery({
    queryKey: ["dashboard", "welfare-gap", profileId],
    queryFn: () => welfareGapFn({ data: { citizen_profile_id: profileId } }),
    enabled: hydrated,
  });

  const loading =
    !hydrated ||
    personal.isLoading ||
    household.isLoading ||
    assistant.isLoading ||
    progress.isLoading ||
    welfareGap.isLoading;

  const error =
    personal.error ||
    household.error ||
    assistant.error ||
    progress.error ||
    welfareGap.error;

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
              welfareGap.refetch();
            }}
          />
        ) : isEmpty ? (
          <EmptyState />
        ) : (
          <div className="space-y-8">
            <WelfareGapCard data={welfareGap.data} loading={loading} hasProfile={!!profileId} />
            <PersonalSection data={personal.data} loading={loading} />
            <HouseholdSection data={household.data} loading={loading} />
            <WelfareGapSection data={welfareGap.data} loading={loading} hasProfile={!!profileId} />
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

/* -------------------- Welfare Gap (Module 9) -------------------- */

function tierStyles(tier: WelfareGapAnalysis["tier"]) {
  if (tier === "Excellent Welfare Coverage")
    return "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-500/30";
  if (tier === "Moderate Welfare Coverage")
    return "bg-amber-500/10 text-amber-700 dark:text-amber-400 border-amber-500/30";
  return "bg-rose-500/10 text-rose-700 dark:text-rose-400 border-rose-500/30";
}

function WelfareGapCard({
  data,
  loading,
  hasProfile,
}: {
  data: WelfareGapAnalysis | undefined;
  loading: boolean;
  hasProfile: boolean;
}) {
  return (
    <section
      aria-labelledby="welfare-gap-card"
      className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-5 shadow-sm"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <Target className="size-5" />
          </div>
          <div>
            <h2 id="welfare-gap-card" className="text-lg font-semibold text-foreground">
              Welfare Gap Intelligence
            </h2>
            <p className="text-xs text-muted-foreground">
              Opportunity Score, estimated annual benefit, and missed schemes.
            </p>
          </div>
        </div>
        {!loading && data ? (
          <Badge variant="outline" className={cn("hidden sm:inline-flex", tierStyles(data.tier))}>
            {data.tier}
          </Badge>
        ) : null}
      </div>

      <div className="mt-4 grid gap-3 sm:grid-cols-3">
        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Opportunity Score</span>
            <Gauge className="size-4" />
          </div>
          {loading || !data ? (
            <Skeleton className="mt-2 h-8 w-20" />
          ) : (
            <>
              <div className="mt-1 flex items-baseline gap-1">
                <span className="text-3xl font-bold tracking-tight text-foreground">
                  {data.score}
                </span>
                <span className="text-sm text-muted-foreground">/ 100</span>
              </div>
              <Progress value={data.score} className="mt-2 h-1.5" />
              <p className={cn("mt-2 text-xs font-medium")}>
                <span
                  className={cn(
                    "rounded-full border px-2 py-0.5",
                    tierStyles(data.tier),
                  )}
                >
                  {data.tier}
                </span>
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Estimated annual benefit</span>
            <IndianRupee className="size-4" />
          </div>
          {loading || !data ? (
            <Skeleton className="mt-2 h-8 w-28" />
          ) : (
            <>
              <div className="mt-1 text-2xl font-bold tracking-tight text-foreground">
                {formatINR(data.estimatedAnnualBenefitINR)}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                Your household may be eligible for approximately{" "}
                <span className="font-medium text-foreground">
                  {formatINR(data.estimatedAnnualBenefitINR)}
                </span>{" "}
                in annual welfare benefits.
              </p>
            </>
          )}
        </div>

        <div className="rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Total missed opportunities</span>
            <AlertTriangle className="size-4" />
          </div>
          {loading || !data ? (
            <Skeleton className="mt-2 h-8 w-16" />
          ) : (
            <>
              <div className="mt-1 text-3xl font-bold tracking-tight text-foreground">
                {data.household.totalMissed}
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {data.household.totalExplored} of {data.household.totalEligible}{" "}
                eligible schemes explored.
              </p>
            </>
          )}
        </div>
      </div>

      {!loading && data && !data.hasData ? (
        <p className="mt-3 text-xs text-muted-foreground">
          {hasProfile
            ? "Run an eligibility check to unlock welfare gap intelligence."
            : "Create a profile to unlock welfare gap intelligence."}
        </p>
      ) : null}
    </section>
  );
}

function WelfareGapSection({
  data,
  loading,
  hasProfile,
}: {
  data: WelfareGapAnalysis | undefined;
  loading: boolean;
  hasProfile: boolean;
}) {
  return (
    <section aria-labelledby="welfare-gap">
      <SectionHeader
        id="welfare-gap"
        icon={<Target className="size-4" />}
        title="Household Welfare Gap Analysis"
        subtitle="Eligible vs. explored schemes per family member, with explainable missed opportunities."
      />

      {loading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : !data || !data.hasData ? (
        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm">
          <Info className="mx-auto size-7 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">
            {hasProfile
              ? "Run an eligibility check and add family members to unlock household welfare insights."
              : "Use Sarkari Sahayak's eligibility tools to unlock household welfare insights."}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button asChild size="sm">
              <Link to="/eligibility">
                <ListChecks className="mr-1 size-4" />
                Check eligibility
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/family-planner">
                <Users className="mr-1 size-4" />
                Add family
              </Link>
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {data.members.map((m) => (
              <article
                key={m.memberId}
                className="rounded-2xl border bg-card p-4 shadow-sm"
              >
                <header className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold text-foreground">
                      {m.name}
                    </h3>
                    <p className="text-xs text-muted-foreground">{m.relationship}</p>
                  </div>
                  <Badge variant="secondary" className="text-[10px]">
                    {m.missedCount} missed
                  </Badge>
                </header>
                <dl className="mt-3 grid grid-cols-3 gap-2 text-center text-xs">
                  <div className="rounded-lg bg-accent/50 p-2">
                    <dt className="text-muted-foreground">Eligible</dt>
                    <dd className="text-base font-semibold text-foreground">
                      {m.eligibleCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-2">
                    <dt className="text-muted-foreground">Explored</dt>
                    <dd className="text-base font-semibold text-foreground">
                      {m.exploredCount}
                    </dd>
                  </div>
                  <div className="rounded-lg bg-accent/50 p-2">
                    <dt className="text-muted-foreground">Missed</dt>
                    <dd className="text-base font-semibold text-foreground">
                      {m.missedCount}
                    </dd>
                  </div>
                </dl>
                {m.missedSchemes.length > 0 ? (
                  <ul className="mt-3 space-y-2">
                    {m.missedSchemes.slice(0, 3).map((s) => (
                      <li
                        key={s.schemeId}
                        className="rounded-lg border bg-background/60 p-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <Link
                            to="/schemes/$id"
                            params={{ id: s.schemeId }}
                            className="text-xs font-medium text-foreground hover:text-primary"
                          >
                            {s.schemeName}
                          </Link>
                          <span className="shrink-0 text-[11px] font-semibold text-primary">
                            {formatINR(s.annualValueINR)}/yr
                          </span>
                        </div>
                        <p className="mt-1 text-[11px] text-muted-foreground">
                          <span className="font-medium">Why missed: </span>
                          {s.reasonText}
                        </p>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-3 text-xs text-muted-foreground">
                    All identified schemes for {m.name} have been explored.
                  </p>
                )}
              </article>
            ))}
          </div>

          {data.topMissedByValue.length > 0 ? (
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <IndianRupee className="size-4 text-primary" />
                <h3 className="text-sm font-semibold text-foreground">
                  Highest-value missed schemes
                </h3>
              </div>
              <ul className="mt-3 divide-y">
                {data.topMissedByValue.map((s) => (
                  <li
                    key={s.schemeId}
                    className="flex items-center justify-between gap-2 py-2 text-xs"
                  >
                    <div className="min-w-0">
                      <Link
                        to="/schemes/$id"
                        params={{ id: s.schemeId }}
                        className="block truncate font-medium text-foreground hover:text-primary"
                      >
                        {s.schemeName}
                      </Link>
                      <p className="truncate text-[11px] text-muted-foreground">
                        {s.category} · {s.scope}
                      </p>
                    </div>
                    <span className="shrink-0 text-sm font-semibold text-primary">
                      {formatINR(s.annualValueINR)}/yr
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          {data.insights.length > 0 ? (
            <div className="rounded-2xl border bg-card p-4 shadow-sm">
              <div className="flex items-center gap-2">
                <Lightbulb className="size-4 text-amber-500" />
                <h3 className="text-sm font-semibold text-foreground">
                  Household insights
                </h3>
              </div>
              <ul className="mt-3 space-y-2">
                {data.insights.map((i) => (
                  <li key={i.id} className="rounded-lg bg-accent/40 p-3">
                    <p className="text-sm font-medium text-foreground">{i.title}</p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {i.detail}
                    </p>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      )}
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
