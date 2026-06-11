import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Calendar,
  Download,
  Info,
  Map as MapIcon,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";

import {
  fetchCitizenProfile,
  getStoredProfileId,
} from "@/lib/citizen-profile/storage";

import { generateRoadmap } from "@/lib/welfare-roadmap/roadmapGenerator";
import { LIFE_EVENTS } from "@/lib/welfare-roadmap/lifeEventSimulator";
import { exportRoadmap } from "@/lib/welfare-roadmap/roadmapExporter";
import type { LifeEventId, Roadmap } from "@/lib/welfare-roadmap/types";

export const Route = createFileRoute("/welfare-roadmap")({
  head: () => ({
    meta: [
      { title: "Personalized Welfare Roadmap — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Plan your next 5 years of welfare opportunities with predictive, explainable scheme recommendations.",
      },
      {
        property: "og:title",
        content: "Personalized Welfare Roadmap — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Predictive welfare planning for citizens and households.",
      },
    ],
  }),
  component: WelfareRoadmapPage,
});

function WelfareRoadmapPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  const [event, setEvent] = useState<LifeEventId | null>(null);

  useEffect(() => {
    setProfileId(getStoredProfileId());
  }, []);

  const profileQ = useQuery({
    queryKey: ["roadmap-profile", profileId],
    queryFn: () => (profileId ? fetchCitizenProfile(profileId) : null),
    enabled: !!profileId,
  });

  const profile = profileQ.data ?? null;

  const roadmapQ = useQuery({
    queryKey: ["welfare-roadmap", profileId, event],
    queryFn: () => (profile ? generateRoadmap(profile, event) : null),
    enabled: !!profile,
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-accent/30">
      <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-10">
        <div className="mb-4">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" /> Back
            </Link>
          </Button>
        </div>

        <header className="mb-6">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/70 px-3 py-1 text-xs text-muted-foreground">
            <MapIcon className="size-3.5" /> Module 15 · Personalized Welfare Roadmap
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Welfare Roadmap
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            A predictive 5-year welfare journey for you and your household —
            explainable, household-aware and research-grade.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <Info className="mr-1 inline size-4 text-primary" />
          Future recommendations are generated using verified scheme rules,
          household context, and explainable welfare planning logic.
        </div>

        {!profileId ? <NoProfile /> : null}
        {profileId && (profileQ.isLoading || roadmapQ.isLoading) ? <LoadingState /> : null}
        {profileQ.isError ? (
          <ErrorState message={(profileQ.error as Error).message} />
        ) : null}
        {roadmapQ.isError ? (
          <ErrorState message={(roadmapQ.error as Error).message} />
        ) : null}

        {roadmapQ.data ? (
          <Workspace
            roadmap={roadmapQ.data}
            event={event}
            setEvent={setEvent}
          />
        ) : null}
      </div>
    </main>
  );
}

function NoProfile() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground">
          Create your citizen profile to generate your welfare roadmap.
        </p>
        <Button asChild className="mt-4">
          <Link to="/onboarding">Create Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function LoadingState() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-24 w-full" />
      <Skeleton className="h-64 w-full" />
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="py-6">
        <p className="text-sm text-destructive">Error: {message}</p>
      </CardContent>
    </Card>
  );
}

function bandTone(band: Roadmap["journeyBand"]) {
  if (band === "Welfare Ready") return "bg-emerald-600 text-white";
  if (band === "Developing") return "bg-amber-600 text-white";
  return "bg-rose-600 text-white";
}

function Workspace({
  roadmap,
  event,
  setEvent,
}: {
  roadmap: Roadmap;
  event: LifeEventId | null;
  setEvent: (id: LifeEventId | null) => void;
}) {
  return (
    <div className="space-y-6">
      <ScoreCard roadmap={roadmap} />
      <SimulatorCard event={event} setEvent={setEvent} />

      <Tabs defaultValue="timeline" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="household">Household</TabsTrigger>
          <TabsTrigger value="forecast">Forecast</TabsTrigger>
          <TabsTrigger value="insights">Insights</TabsTrigger>
          <TabsTrigger value="export">Export</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <TimelineSection roadmap={roadmap} />
        </TabsContent>
        <TabsContent value="household">
          <HouseholdSection roadmap={roadmap} />
        </TabsContent>
        <TabsContent value="forecast">
          <ForecastSection roadmap={roadmap} />
        </TabsContent>
        <TabsContent value="insights">
          <InsightsSection roadmap={roadmap} />
        </TabsContent>
        <TabsContent value="export">
          <ExportSection roadmap={roadmap} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function ScoreCard({ roadmap }: { roadmap: Roadmap }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Welfare Journey Score</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-wrap items-center gap-4">
          <div className="text-5xl font-bold">{roadmap.journeyScore}</div>
          <div>
            <Badge className={bandTone(roadmap.journeyBand)}>
              {roadmap.journeyBand}
            </Badge>
            <div className="mt-1 text-xs text-muted-foreground">
              Preparedness for future welfare opportunities (0–100)
            </div>
          </div>
          <div className="ml-auto text-right text-sm">
            <div className="text-xs text-muted-foreground">5-yr projected benefits</div>
            <div className="text-lg font-semibold">
              ₹{roadmap.longTermBenefit.toLocaleString("en-IN")}
            </div>
          </div>
        </div>
        <Progress value={roadmap.journeyScore} className="mt-4 h-2" />
        <div className="mt-2 flex justify-between text-[10px] text-muted-foreground">
          <span>0 · Vulnerable</span>
          <span>40 · Developing</span>
          <span>70 · Welfare Ready</span>
        </div>
      </CardContent>
    </Card>
  );
}

function SimulatorCard({
  event,
  setEvent,
}: {
  event: LifeEventId | null;
  setEvent: (id: LifeEventId | null) => void;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Sparkles className="size-4 text-primary" /> Life Event Simulation
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-3 text-sm text-muted-foreground">
          Simulate a future life event to see how your welfare roadmap adapts.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant={event === null ? "default" : "outline"}
            onClick={() => setEvent(null)}
          >
            Current Profile
          </Button>
          {LIFE_EVENTS.map((e) => (
            <Button
              key={e.id}
              size="sm"
              variant={event === e.id ? "default" : "outline"}
              onClick={() => setEvent(e.id)}
              title={e.description}
            >
              {e.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function TimelineSection({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="space-y-4">
      {roadmap.years.map((y, idx) => (
        <Card key={y.year}>
          <CardContent className="pt-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-3">
                <div className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary">
                  <Calendar className="size-5" />
                </div>
                <div>
                  <div className="text-lg font-semibold">
                    {y.year} · {y.focus}
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {y.stage} · Age {y.age}
                  </div>
                </div>
              </div>
              <Badge variant="outline">{y.categories.join(" · ")}</Badge>
            </div>

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Recommended Schemes
                </div>
                {y.schemes.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No matching schemes — refine your profile.
                  </div>
                ) : (
                  <ul className="space-y-1 text-sm">
                    {y.schemes.map((s) => (
                      <li key={s.id} className="rounded border bg-card px-2 py-1">
                        {s.scheme_name}
                        <span className="ml-1 text-xs text-muted-foreground">
                          · {s.category}
                        </span>
                      </li>
                    ))}
                  </ul>
                )}
                <div className="mt-2 text-xs text-muted-foreground">
                  Expected outcome: {y.expectedOutcome}
                </div>
              </div>
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
                  Why this is recommended
                </div>
                <ul className="space-y-1 text-xs">
                  {y.rationale.map((r, i) => (
                    <li key={i}>✓ {r}</li>
                  ))}
                </ul>
              </div>
            </div>
            {idx < roadmap.years.length - 1 ? (
              <div className="mt-3 text-center text-xs text-muted-foreground">↓</div>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function HouseholdSection({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Users className="size-4" /> Unified roadmap across {roadmap.household.length} household
        member(s)
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {roadmap.household.map((m, i) => (
          <Card key={i}>
            <CardHeader className="pb-2">
              <CardTitle className="text-base">
                {m.displayName}
                <span className="ml-2 text-xs font-normal text-muted-foreground">
                  {m.member?.relationship ?? "You"} · {m.stage} · Age {m.age}
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Predicted welfare needs
                </div>
                <div className="text-sm">
                  {m.predictedNeeds.join(", ") || "—"}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold uppercase text-muted-foreground">
                  Recommended future schemes
                </div>
                <ul className="mt-1 space-y-1">
                  {m.futureSchemes.length === 0 ? (
                    <li className="text-muted-foreground">None matched yet</li>
                  ) : (
                    m.futureSchemes.map((s) => (
                      <li key={s.id} className="rounded border bg-card px-2 py-1 text-xs">
                        {s.scheme_name} · {s.category}
                      </li>
                    ))
                  )}
                </ul>
              </div>
              <div className="rounded bg-muted/40 p-2 text-xs">
                Estimated annual benefit potential:{" "}
                <strong>₹{m.estimatedAnnualBenefit.toLocaleString("en-IN")}</strong>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

function ForecastSection({ roadmap }: { roadmap: Roadmap }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Upcoming Opportunities</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {roadmap.upcoming.length === 0 ? (
            <p className="text-muted-foreground">No upcoming opportunities detected.</p>
          ) : (
            roadmap.upcoming.map((u, i) => (
              <div key={i} className="rounded border bg-card p-2">
                <div className="font-medium">{u.scheme.scheme_name}</div>
                <div className="text-xs text-muted-foreground">
                  In {u.yearsAway} year(s) · {u.reason}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Missed (Still Pursuable)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {roadmap.missed.length === 0 ? (
            <p className="text-muted-foreground">No missed opportunities — great coverage!</p>
          ) : (
            roadmap.missed.map((u, i) => (
              <div key={i} className="rounded border bg-card p-2">
                <div className="font-medium">{u.scheme.scheme_name}</div>
                <div className="text-xs text-muted-foreground">{u.reason}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
      <Card className="sm:col-span-2">
        <CardHeader>
          <CardTitle className="text-base">Long-term Benefit Projection</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-3xl font-bold">
            ₹{roadmap.longTermBenefit.toLocaleString("en-IN")}
          </div>
          <div className="text-xs text-muted-foreground">
            Total estimated benefits across the next {roadmap.years.length} years
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function InsightsSection({ roadmap }: { roadmap: Roadmap }) {
  const insights = useMemo(() => {
    const categoryCount = new Map<string, number>();
    for (const y of roadmap.years) {
      for (const s of y.schemes) {
        categoryCount.set(s.category, (categoryCount.get(s.category) ?? 0) + 1);
      }
    }
    const pathways = [...categoryCount.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const avgBenefit = Math.round(
      roadmap.household.reduce((s, m) => s + m.estimatedAnnualBenefit, 0) /
        Math.max(1, roadmap.household.length),
    );
    const commonGoals = pathways.slice(0, 3).map((p) => p[0]);
    return { pathways, avgBenefit, commonGoals };
  }, [roadmap]);

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Most Common Future Goals</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {insights.commonGoals.length === 0 ? "—" : insights.commonGoals.join(", ")}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Avg Annual Benefit / Member</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          ₹{insights.avgBenefit.toLocaleString("en-IN")}
        </CardContent>
      </Card>
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm">Journey Score</CardTitle>
        </CardHeader>
        <CardContent className="text-2xl font-bold">
          {roadmap.journeyScore}/100
          <div className="text-xs font-normal text-muted-foreground">
            {roadmap.journeyBand}
          </div>
        </CardContent>
      </Card>
      <Card className="sm:col-span-3">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <TrendingUp className="size-4" /> Common Welfare Pathways
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {insights.pathways.map(([cat, count]) => (
              <div key={cat} className="flex items-center gap-2">
                <div className="w-40 text-sm">{cat}</div>
                <Progress
                  value={(count / (insights.pathways[0]?.[1] ?? 1)) * 100}
                  className="h-2 flex-1"
                />
                <div className="w-8 text-right text-sm font-medium">{count}</div>
              </div>
            ))}
            {insights.pathways.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pathway data yet.</p>
            ) : null}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function ExportSection({ roadmap }: { roadmap: Roadmap }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Generate Reports</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="mb-4 text-sm text-muted-foreground">
          Export your roadmap as a downloadable PDF.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => exportRoadmap("personal", roadmap)}>
            <Download className="mr-1 size-4" /> Personal Roadmap
          </Button>
          <Button variant="outline" onClick={() => exportRoadmap("household", roadmap)}>
            <Download className="mr-1 size-4" /> Household Roadmap
          </Button>
          <Button variant="outline" onClick={() => exportRoadmap("predictive", roadmap)}>
            <Download className="mr-1 size-4" /> Predictive Summary
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
