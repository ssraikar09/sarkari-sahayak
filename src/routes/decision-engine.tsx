import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ShieldCheck,
  Download,
  Search,
  Info,
  Users,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import {
  fetchCitizenProfile,
  getStoredProfileId,
} from "@/lib/citizen-profile/storage";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import {
  listFamilyMembers,
  familyMemberToProfileShape,
  type FamilyMember,
} from "@/lib/family-planner";

import { buildDecisionReport, buildOverview, buildSchemeDecision } from "@/lib/decision-engine/evidenceBuilder";
import { explainWhyNot } from "@/lib/decision-engine/whyNotAnalyzer";
import { getDecisionTimelineFn } from "@/lib/decision-engine/timelineGenerator";
import { exportDecisionReport } from "@/lib/decision-engine/reportExporter";
import type {
  DecisionReport,
  HouseholdMemberDecision,
  SchemeDecision,
  DecisionStatus,
} from "@/lib/decision-engine/types";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";

export const Route = createFileRoute("/decision-engine")({
  head: () => ({
    meta: [
      { title: "Explainable Decision Engine — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Transparent, evidence-backed welfare eligibility decisions with confidence scoring and household explainability.",
      },
      {
        property: "og:title",
        content: "Explainable Decision Engine — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Decisions generated using verified scheme rules and explainable eligibility logic.",
      },
    ],
  }),
  component: DecisionEnginePage,
});

function DecisionEnginePage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => {
    setProfileId(getStoredProfileId());
  }, []);

  const profileQ = useQuery({
    queryKey: ["decision-engine-profile", profileId],
    queryFn: () => (profileId ? fetchCitizenProfile(profileId) : null),
    enabled: !!profileId,
  });

  const profile = profileQ.data ?? null;

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
            <ShieldCheck className="size-3.5" /> Explainable AI Decision Engine 2.0
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Decision Engine
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Transparent, evidence-backed welfare eligibility decisions with confidence scoring,
            household explainability, and exportable research-grade reports.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm text-foreground">
          <Info className="mr-1 inline size-4 text-primary" />
          Decisions are generated using verified scheme rules and explainable eligibility logic.
        </div>

        {!profileId ? <NoProfileState /> : null}
        {profileId && profileQ.isLoading ? <LoadingState /> : null}
        {profileId && profileQ.isError ? (
          <ErrorState message={(profileQ.error as Error).message} />
        ) : null}
        {profile ? <DecisionWorkspace profile={profile} /> : null}
      </div>
    </main>
  );
}

function NoProfileState() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground">
          Create your citizen profile to view explainable eligibility decisions.
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

function DecisionWorkspace({ profile }: { profile: CitizenProfile }) {
  const reportQ = useQuery({
    queryKey: ["decision-report", profile.id],
    queryFn: () => buildDecisionReport(profile),
  });

  const timelineFn = useServerFn(getDecisionTimelineFn);
  const timelineQ = useQuery({
    queryKey: ["decision-timeline", profile.id],
    queryFn: () => timelineFn({ data: { citizen_profile_id: profile.id } }),
  });

  const familyQ = useQuery({
    queryKey: ["decision-family", profile.id],
    queryFn: () => listFamilyMembers(profile.id),
  });

  const schemesQ = useQuery({
    queryKey: ["decision-schemes-pool", profile.state],
    queryFn: async () => {
      const [national, state] = await Promise.all([
        listSchemes({ scope: "National" }),
        listSchemes({ state: profile.state }),
      ]);
      const map = new Map<string, GovernmentScheme>();
      for (const s of [...national, ...state]) map.set(s.id, s);
      return Array.from(map.values());
    },
  });

  const household = useMemo<HouseholdMemberDecision[]>(() => {
    if (!familyQ.data || !schemesQ.data) return [];
    const anchor = {
      id: profile.id,
      state: profile.state,
      district: profile.district,
      preferred_language: profile.preferred_language,
      family_members: profile.family_members,
      created_at: profile.created_at,
    };
    return familyQ.data.map((m) => buildMemberDecision(m, anchor, schemesQ.data!));
  }, [familyQ.data, schemesQ.data, profile]);

  if (reportQ.isLoading) return <LoadingState />;
  if (reportQ.isError)
    return <ErrorState message={(reportQ.error as Error).message} />;
  if (!reportQ.data) return null;

  const report = reportQ.data;

  return (
    <Tabs defaultValue="overview" className="space-y-6">
      <TabsList className="grid w-full grid-cols-2 sm:grid-cols-5">
        <TabsTrigger value="overview">Overview</TabsTrigger>
        <TabsTrigger value="evidence">Evidence</TabsTrigger>
        <TabsTrigger value="why-not">Why Not</TabsTrigger>
        <TabsTrigger value="timeline">Timeline</TabsTrigger>
        <TabsTrigger value="household">Household</TabsTrigger>
      </TabsList>

      <TabsContent value="overview">
        <OverviewSection report={report} household={household} />
      </TabsContent>
      <TabsContent value="evidence">
        <EvidenceSection report={report} />
      </TabsContent>
      <TabsContent value="why-not">
        <WhyNotSection report={report} />
      </TabsContent>
      <TabsContent value="timeline">
        <TimelineSection
          loading={timelineQ.isLoading}
          events={timelineQ.data ?? []}
        />
      </TabsContent>
      <TabsContent value="household">
        <HouseholdSection
          loading={familyQ.isLoading || schemesQ.isLoading}
          household={household}
        />
      </TabsContent>
    </Tabs>
  );
}

function buildMemberDecision(
  member: FamilyMember,
  anchor: {
    id: string;
    state: string;
    district: string;
    preferred_language: string;
    family_members: number;
    created_at: string;
  },
  schemes: GovernmentScheme[],
): HouseholdMemberDecision {
  const shaped = familyMemberToProfileShape(member, anchor) as CitizenProfile;
  const decisions = schemes
    .map((s) => buildSchemeDecision(shaped, s))
    .sort((a, b) => b.confidence.score - a.confidence.score);
  const overview = buildOverview(decisions);
  const eligible = decisions.filter((d) => d.status === "eligible");
  const partial = decisions.filter((d) => d.status === "partial");
  return {
    member,
    overview,
    topEligible: eligible.slice(0, 3),
    topMissed: partial.slice(0, 3),
  };
}

function OverviewSection({
  report,
  household,
}: {
  report: DecisionReport;
  household: HouseholdMemberDecision[];
}) {
  const { overview } = report;
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatTile
          icon={<CheckCircle2 className="size-4 text-emerald-600" />}
          label="Eligible Schemes"
          value={overview.eligible}
          pct={overview.eligiblePct}
          tone="success"
        />
        <StatTile
          icon={<AlertTriangle className="size-4 text-amber-600" />}
          label="Partially Eligible"
          value={overview.partial}
          pct={overview.partialPct}
          tone="warning"
        />
        <StatTile
          icon={<XCircle className="size-4 text-rose-600" />}
          label="Not Eligible"
          value={overview.notEligible}
          pct={overview.notEligiblePct}
          tone="destructive"
        />
        <StatTile
          icon={<ShieldCheck className="size-4 text-primary" />}
          label="Schemes Analysed"
          value={overview.total}
          pct={100}
          tone="muted"
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top Eligible Schemes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {report.decisions
            .filter((d) => d.status === "eligible")
            .slice(0, 5)
            .map((d) => (
              <DecisionRow key={d.scheme.id} decision={d} />
            ))}
          {report.decisions.filter((d) => d.status === "eligible").length === 0 ? (
            <p className="text-sm text-muted-foreground">No fully eligible schemes detected yet.</p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Research Export</CardTitle>
          <div className="flex flex-wrap gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportDecisionReport("decision", report, household)}
            >
              <Download className="mr-1 size-4" /> Decision Report
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportDecisionReport("evidence", report, household)}
            >
              <Download className="mr-1 size-4" /> Evidence Summary
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => exportDecisionReport("household", report, household)}
            >
              <Download className="mr-1 size-4" /> Household Report
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Export decisions, evidence and household explainability as research-grade PDFs.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  pct,
  tone,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  pct: number;
  tone: "success" | "warning" | "destructive" | "muted";
}) {
  const ringClass =
    tone === "success"
      ? "bg-emerald-50 dark:bg-emerald-950/30"
      : tone === "warning"
        ? "bg-amber-50 dark:bg-amber-950/30"
        : tone === "destructive"
          ? "bg-rose-50 dark:bg-rose-950/30"
          : "bg-muted/40";
  return (
    <div className={`rounded-xl border p-4 ${ringClass}`}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-2 text-3xl font-bold">{value}</div>
      <div className="mt-1 text-xs text-muted-foreground">{pct}% of catalogue</div>
    </div>
  );
}

function statusBadge(status: DecisionStatus) {
  if (status === "eligible")
    return (
      <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">Eligible</Badge>
    );
  if (status === "partial")
    return <Badge className="bg-amber-600 text-white hover:bg-amber-600">Partial</Badge>;
  return <Badge variant="destructive">Not Eligible</Badge>;
}

function DecisionRow({ decision }: { decision: SchemeDecision }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{decision.scheme.scheme_name}</div>
          <div className="text-xs text-muted-foreground">
            {decision.scheme.category} · {decision.scheme.scheme_scope}
          </div>
        </div>
        <div className="flex items-center gap-2">
          {statusBadge(decision.status)}
          <div className="text-right">
            <div className="text-sm font-semibold">{decision.confidence.score}/100</div>
            <div className="text-[10px] text-muted-foreground">
              {decision.confidence.label}
            </div>
          </div>
        </div>
      </div>
      <Progress value={decision.confidence.score} className="mt-2 h-1.5" />
    </div>
  );
}

function EvidenceSection({ report }: { report: DecisionReport }) {
  const [filter, setFilter] = useState<"all" | DecisionStatus>("all");
  const [query, setQuery] = useState("");
  const filtered = useMemo(() => {
    return report.decisions
      .filter((d) => (filter === "all" ? true : d.status === filter))
      .filter((d) =>
        query.trim()
          ? d.scheme.scheme_name.toLowerCase().includes(query.trim().toLowerCase())
          : true,
      )
      .slice(0, 30);
  }, [report.decisions, filter, query]);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-8"
            placeholder="Search schemes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        {(["all", "eligible", "partial", "not_eligible"] as const).map((k) => (
          <Button
            key={k}
            size="sm"
            variant={filter === k ? "default" : "outline"}
            onClick={() => setFilter(k)}
          >
            {k === "all" ? "All" : k.replace("_", " ")}
          </Button>
        ))}
      </div>
      <div className="space-y-3">
        {filtered.map((d) => (
          <Card key={d.scheme.id}>
            <CardContent className="space-y-2 pt-4">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-semibold">{d.scheme.scheme_name}</div>
                  <div className="text-xs text-muted-foreground">
                    {d.scheme.category} · {d.scheme.state}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {statusBadge(d.status)}
                  <span className="text-sm font-semibold">{d.confidence.score}/100</span>
                </div>
              </div>
              <ul className="space-y-1 text-sm">
                {d.matched.map((m, i) => (
                  <li key={`m-${i}`} className="flex gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>{m.reason}</span>
                  </li>
                ))}
                {d.unmet.map((m, i) => (
                  <li key={`u-${i}`} className="flex gap-2 text-rose-700 dark:text-rose-400">
                    <XCircle className="mt-0.5 size-4 shrink-0" />
                    <span>{m.reason}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        ))}
        {filtered.length === 0 ? (
          <p className="text-sm text-muted-foreground">No decisions match the current filter.</p>
        ) : null}
      </div>
    </div>
  );
}

function WhyNotSection({ report }: { report: DecisionReport }) {
  const candidates = report.decisions.filter(
    (d) => d.status !== "eligible" && d.unmet.length > 0,
  );
  const [selectedId, setSelectedId] = useState<string | null>(
    candidates[0]?.scheme.id ?? null,
  );
  const selected = candidates.find((d) => d.scheme.id === selectedId) ?? candidates[0];
  if (!selected)
    return (
      <Card>
        <CardContent className="py-6 text-sm text-muted-foreground">
          You appear eligible for every analysed scheme — nothing to explain.
        </CardContent>
      </Card>
    );

  const explanation = explainWhyNot(selected);
  return (
    <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Ask: "Why am I not eligible?"</CardTitle>
        </CardHeader>
        <CardContent className="max-h-[480px] space-y-1 overflow-y-auto">
          {candidates.slice(0, 30).map((d) => (
            <button
              key={d.scheme.id}
              onClick={() => setSelectedId(d.scheme.id)}
              className={`block w-full rounded-md border px-3 py-2 text-left text-sm hover:bg-accent ${
                selected.scheme.id === d.scheme.id ? "bg-accent" : ""
              }`}
            >
              <div className="font-medium">{d.scheme.scheme_name}</div>
              <div className="text-xs text-muted-foreground">
                {d.confidence.score}/100 · {d.unmet.length} unmet
              </div>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selected.scheme.scheme_name}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm">{explanation.summary}</p>

          {explanation.matchedCriteria.length > 0 ? (
            <div>
              <h3 className="mb-1 text-sm font-semibold">What matched</h3>
              <ul className="space-y-1 text-sm">
                {explanation.matchedCriteria.map((c, i) => (
                  <li key={i} className="flex gap-2 text-emerald-700 dark:text-emerald-400">
                    <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
                    <span>{c.reason}</span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}

          <div>
            <h3 className="mb-1 text-sm font-semibold">Missing criteria</h3>
            <ul className="space-y-1 text-sm">
              {explanation.missingCriteria.map((c, i) => (
                <li key={i} className="flex gap-2 text-rose-700 dark:text-rose-400">
                  <XCircle className="mt-0.5 size-4 shrink-0" />
                  <span>{c.reason}</span>
                </li>
              ))}
            </ul>
          </div>

          {explanation.suggestedActions.length > 0 ? (
            <div>
              <h3 className="mb-1 text-sm font-semibold">Suggested next steps</h3>
              <ul className="list-disc space-y-1 pl-5 text-sm text-muted-foreground">
                {explanation.suggestedActions.map((a, i) => (
                  <li key={i}>{a}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}

function TimelineSection({
  loading,
  events,
}: {
  loading: boolean;
  events: Awaited<ReturnType<typeof getDecisionTimelineFn>>;
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Decision Journey Timeline</CardTitle>
      </CardHeader>
      <CardContent>
        <ol className="space-y-4">
          {events.map((e, i) => (
            <li key={e.key} className="flex gap-3">
              <div className="flex flex-col items-center">
                <div
                  className={`flex size-7 items-center justify-center rounded-full border text-xs font-semibold ${
                    e.completed
                      ? "border-emerald-600 bg-emerald-600 text-white"
                      : "border-muted-foreground/40 text-muted-foreground"
                  }`}
                >
                  {i + 1}
                </div>
                {i < events.length - 1 ? (
                  <div className="h-full w-px flex-1 bg-border" />
                ) : null}
              </div>
              <div className="pb-4">
                <div className="font-medium">{e.label}</div>
                <div className="text-xs text-muted-foreground">
                  {e.completed
                    ? `${e.count > 1 ? `${e.count} events · ` : ""}First seen ${formatDate(e.occurredAt)}`
                    : "Not completed yet"}
                </div>
              </div>
            </li>
          ))}
        </ol>
      </CardContent>
    </Card>
  );
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function HouseholdSection({
  loading,
  household,
}: {
  loading: boolean;
  household: HouseholdMemberDecision[];
}) {
  if (loading) return <Skeleton className="h-64 w-full" />;
  if (household.length === 0)
    return (
      <Card>
        <CardContent className="py-6 text-center text-sm text-muted-foreground">
          <Users className="mx-auto mb-2 size-6 opacity-60" />
          Add family members in the Family Planner to see household decisions.
          <div className="mt-3">
            <Button asChild size="sm" variant="outline">
              <Link to="/family-planner">Open Family Planner</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {household.map((h) => (
        <Card key={h.member.id}>
          <CardHeader>
            <CardTitle className="text-base">
              {h.member.full_name}
              <span className="ml-2 text-xs font-normal text-muted-foreground">
                {h.member.relationship} · Age {h.member.age}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap gap-2 text-xs">
              <Badge className="bg-emerald-600 text-white hover:bg-emerald-600">
                {h.overview.eligible} eligible
              </Badge>
              <Badge className="bg-amber-600 text-white hover:bg-amber-600">
                {h.overview.partial} partial
              </Badge>
              <Badge variant="destructive">{h.overview.notEligible} not eligible</Badge>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Top eligible
              </div>
              <ul className="mt-1 space-y-1 text-sm">
                {h.topEligible.length === 0 ? (
                  <li className="text-muted-foreground">None</li>
                ) : (
                  h.topEligible.map((d) => (
                    <li key={d.scheme.id} className="flex justify-between gap-2">
                      <span>{d.scheme.scheme_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.confidence.score}/100
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
            <div>
              <div className="text-xs font-semibold uppercase text-muted-foreground">
                Missed opportunities
              </div>
              <ul className="mt-1 space-y-1 text-sm">
                {h.topMissed.length === 0 ? (
                  <li className="text-muted-foreground">None</li>
                ) : (
                  h.topMissed.map((d) => (
                    <li key={d.scheme.id} className="flex justify-between gap-2">
                      <span>{d.scheme.scheme_name}</span>
                      <span className="text-xs text-muted-foreground">
                        {d.confidence.score}/100
                      </span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
