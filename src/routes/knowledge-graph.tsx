import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Download,
  Info,
  Network,
  ShieldCheck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

import {
  fetchCitizenProfile,
  getStoredProfileId,
} from "@/lib/citizen-profile/storage";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import { listFamilyMembers } from "@/lib/family-planner";
import { listSchemes, type GovernmentScheme } from "@/lib/schemes";
import { getWelfareGapFn } from "@/lib/welfare-gap/gapAnalyzer";
import { buildKnowledgeGraph } from "@/lib/knowledge-graph/graphBuilder";
import { riskColor } from "@/lib/knowledge-graph/householdMapper";
import { exportKnowledgeGraph } from "@/lib/knowledge-graph/graphExporter";
import type {
  HouseholdKnowledgeGraph,
  HouseholdMemberSummary,
  SchemeRelationship,
} from "@/lib/knowledge-graph/types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export const Route = createFileRoute("/knowledge-graph")({
  head: () => ({
    meta: [
      { title: "Household Welfare Knowledge Graph — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Interactive household welfare knowledge graph connecting citizens, schemes, goals, and explainable AI decisions.",
      },
      {
        property: "og:title",
        content: "Household Welfare Knowledge Graph — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Verified scheme relationships visualised across households, navigator goals and decision evidence.",
      },
    ],
  }),
  component: KnowledgeGraphPage,
});

function KnowledgeGraphPage() {
  const [profileId, setProfileId] = useState<string | null>(null);
  useEffect(() => setProfileId(getStoredProfileId()), []);

  const profileQ = useQuery({
    queryKey: ["kg-profile", profileId],
    queryFn: () => (profileId ? fetchCitizenProfile(profileId) : null),
    enabled: !!profileId,
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
            <Network className="size-3.5" /> Module 14 · Household Welfare Knowledge Graph
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
            Knowledge Graph
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Visualise how households, family members, eligible schemes, navigator goals and
            decision evidence connect into a single explainable welfare network.
          </p>
        </header>

        <div className="mb-6 rounded-lg border border-primary/20 bg-primary/5 p-3 text-sm">
          <Info className="mr-1 inline size-4 text-primary" />
          This graph is generated using verified scheme relationships and explainable eligibility logic.
        </div>

        {!profileId ? <NoProfile /> : null}
        {profileId && profileQ.isLoading ? <Skeleton className="h-96 w-full" /> : null}
        {profileQ.isError ? (
          <ErrorBox message={(profileQ.error as Error).message} />
        ) : null}
        {profileQ.data ? <GraphWorkspace profile={profileQ.data} /> : null}
      </div>
    </main>
  );
}

function NoProfile() {
  return (
    <Card>
      <CardContent className="py-8 text-center">
        <p className="text-muted-foreground">
          Create your citizen profile to view the household knowledge graph.
        </p>
        <Button asChild className="mt-4">
          <Link to="/onboarding">Create Profile</Link>
        </Button>
      </CardContent>
    </Card>
  );
}

function ErrorBox({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="py-6 text-sm text-destructive">
        Error: {message}
      </CardContent>
    </Card>
  );
}

function GraphWorkspace({ profile }: { profile: CitizenProfile }) {
  const gapFn = useServerFn(getWelfareGapFn);
  const gapQ = useQuery({
    queryKey: ["kg-gap", profile.id],
    queryFn: () => gapFn({ data: { citizen_profile_id: profile.id } }),
  });
  const familyQ = useQuery({
    queryKey: ["kg-family", profile.id],
    queryFn: () => listFamilyMembers(profile.id),
  });
  const schemesQ = useQuery({
    queryKey: ["kg-schemes", profile.state],
    queryFn: async () => {
      const [n, s] = await Promise.all([
        listSchemes({ scope: "National" }),
        listSchemes({ state: profile.state }),
      ]);
      const m = new Map<string, GovernmentScheme>();
      for (const x of [...n, ...s]) m.set(x.id, x);
      return Array.from(m.values());
    },
  });

  const graph = useMemo<HouseholdKnowledgeGraph | null>(() => {
    if (!gapQ.data || !familyQ.data || !schemesQ.data) return null;
    return buildKnowledgeGraph({
      citizen: profile,
      family: familyQ.data,
      schemes: schemesQ.data,
      gap: gapQ.data,
    });
  }, [profile, gapQ.data, familyQ.data, schemesQ.data]);

  if (gapQ.isLoading || familyQ.isLoading || schemesQ.isLoading)
    return <Skeleton className="h-[600px] w-full" />;
  if (gapQ.isError) return <ErrorBox message={(gapQ.error as Error).message} />;
  if (!graph) return null;

  return (
    <div className="space-y-6">
      <ExportBar graph={graph} />
      <GraphCanvas graph={graph} />
      <HouseholdSection graph={graph} />
      <SchemeSection graph={graph} />
      <GoalSection graph={graph} />
      <RiskHeatmap graph={graph} />
      <InsightsSection graph={graph} />
    </div>
  );
}

function ExportBar({ graph }: { graph: HouseholdKnowledgeGraph }) {
  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2 space-y-0">
        <CardTitle className="text-base">Research Export</CardTitle>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => exportKnowledgeGraph("household", graph)}>
            <Download className="mr-1 size-4" /> Household Report
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportKnowledgeGraph("network", graph)}>
            <Download className="mr-1 size-4" /> Welfare Network
          </Button>
          <Button size="sm" variant="outline" onClick={() => exportKnowledgeGraph("research", graph)}>
            <Download className="mr-1 size-4" /> Research Summary
          </Button>
        </div>
      </CardHeader>
    </Card>
  );
}

/**
 * Layered graph: Citizen → Members → Schemes → Goals.
 * Pure SVG so no extra dependencies are needed.
 */
function GraphCanvas({ graph }: { graph: HouseholdKnowledgeGraph }) {
  const cols = useMemo(() => {
    const citizenNode = graph.nodes.find((n) => n.kind === "citizen")!;
    const memberNodes = graph.nodes.filter((n) => n.kind === "member");
    const schemeNodes = graph.nodes.filter((n) => n.kind === "scheme").slice(0, 12);
    const goalNodes = graph.nodes.filter((n) => n.kind === "goal");
    return { citizenNode, memberNodes, schemeNodes, goalNodes };
  }, [graph]);

  const W = 960;
  const H = Math.max(420, 60 + Math.max(cols.memberNodes.length, cols.schemeNodes.length, cols.goalNodes.length) * 46);
  const colX = [80, 320, 600, 880];

  const positions = new Map<string, { x: number; y: number }>();
  positions.set(cols.citizenNode.id, { x: colX[0], y: H / 2 });
  layout(cols.memberNodes.map((n) => n.id), colX[1], H, positions);
  layout(cols.schemeNodes.map((n) => n.id), colX[2], H, positions);
  layout(cols.goalNodes.map((n) => n.id), colX[3], H, positions);

  const renderedIds = new Set(positions.keys());
  const edges = graph.edges.filter((e) => renderedIds.has(e.from) && renderedIds.has(e.to));

  const [activeId, setActiveId] = useState<string | null>(null);
  const activeScheme: SchemeRelationship | undefined =
    activeId?.startsWith("scheme:")
      ? graph.schemes.find((s) => `scheme:${s.schemeId}` === activeId)
      : undefined;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Welfare Knowledge Graph</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <svg viewBox={`0 0 ${W} ${H}`} className="min-w-[720px] w-full">
            {/* Edges */}
            {edges.map((e) => {
              const a = positions.get(e.from)!;
              const b = positions.get(e.to)!;
              const isActive = activeId && (e.from === activeId || e.to === activeId);
              return (
                <line
                  key={e.id}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isActive ? "hsl(var(--primary))" : "currentColor"}
                  strokeOpacity={isActive ? 0.8 : 0.18}
                  strokeWidth={isActive ? 1.5 : 1}
                />
              );
            })}
            {/* Column labels */}
            {(["Citizen", "Family", "Schemes", "Goals"] as const).map((l, i) => (
              <text key={l} x={colX[i]} y={18} fontSize={11} textAnchor="middle" className="fill-muted-foreground">
                {l}
              </text>
            ))}
            {/* Nodes */}
            {graph.nodes.map((n) => {
              const p = positions.get(n.id);
              if (!p) return null;
              const fill = nodeFill(n.kind, n.meta?.risk as string | undefined);
              return (
                <g
                  key={n.id}
                  transform={`translate(${p.x}, ${p.y})`}
                  className="cursor-pointer"
                  onClick={() => setActiveId(n.id === activeId ? null : n.id)}
                >
                  <circle r={n.kind === "citizen" ? 18 : 12} fill={fill} stroke="#fff" strokeWidth={2} />
                  <text
                    x={n.kind === "goal" ? -18 : 18}
                    y={4}
                    fontSize={11}
                    textAnchor={n.kind === "goal" ? "end" : "start"}
                    className="fill-foreground"
                  >
                    {truncate(n.label, 28)}
                  </text>
                </g>
              );
            })}
          </svg>
        </div>
        {activeScheme ? (
          <div className="mt-4 rounded-lg border bg-muted/30 p-4 text-sm">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="font-semibold">{activeScheme.schemeName}</div>
                <div className="text-xs text-muted-foreground">
                  {activeScheme.category} · {activeScheme.scope}
                </div>
              </div>
              <Badge>{activeScheme.confidence}/100 confidence</Badge>
            </div>
            <div className="mt-2 text-xs text-muted-foreground">
              {activeScheme.relatedMemberIds.length} household member(s) eligible · {activeScheme.evidenceCount} avg evidence criteria · supports {activeScheme.goalCategories.join(", ")}
            </div>
            <Button asChild size="sm" variant="link" className="mt-1 h-auto p-0">
              <Link to="/decision-engine">Open in Decision Engine →</Link>
            </Button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            Tap any node to see its connections. Tap a scheme to view eligibility evidence.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function layout(
  ids: string[],
  x: number,
  H: number,
  positions: Map<string, { x: number; y: number }>,
) {
  const n = ids.length;
  if (n === 0) return;
  const padding = 40;
  const spacing = (H - padding * 2) / Math.max(n - 1, 1);
  ids.forEach((id, i) => {
    const y = n === 1 ? H / 2 : padding + i * spacing;
    positions.set(id, { x, y });
  });
}

function nodeFill(kind: string, risk?: string): string {
  if (kind === "citizen") return "hsl(var(--primary))";
  if (kind === "member") {
    if (risk === "High") return "#e11d48";
    if (risk === "Moderate") return "#d97706";
    if (risk === "Low") return "#059669";
    return "#6366f1";
  }
  if (kind === "scheme") return "#0ea5e9";
  if (kind === "goal") return "#7c3aed";
  return "#64748b";
}

function truncate(s: string, n: number): string {
  return s.length <= n ? s : s.slice(0, n - 1) + "…";
}

function HouseholdSection({ graph }: { graph: HouseholdKnowledgeGraph }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Household View</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {graph.members.map((m) => (
          <MemberCard key={m.memberId} m={m} />
        ))}
        {graph.members.length === 0 ? (
          <p className="text-sm text-muted-foreground">No household data yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function MemberCard({ m }: { m: HouseholdMemberSummary }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <div className="flex items-start justify-between gap-2">
        <div>
          <div className="font-semibold">{m.name}</div>
          <div className="text-xs text-muted-foreground">{m.relationship}</div>
        </div>
        <Badge
          style={{ backgroundColor: riskColor(m.riskCategory), color: "white" }}
          className="hover:opacity-90"
        >
          {m.riskCategory} Risk
        </Badge>
      </div>
      <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
        <Stat label="Opportunity" value={`${m.opportunityScore}/100`} />
        <Stat label="Eligible" value={String(m.eligibleCount)} />
        <Stat label="Missed" value={String(m.missedCount)} />
        <Stat label="Est. Benefit" value={formatINR(m.estimatedAnnualBenefitINR)} />
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 px-2 py-1.5">
      <div className="text-[10px] uppercase text-muted-foreground">{label}</div>
      <div className="text-sm font-semibold">{value}</div>
    </div>
  );
}

function SchemeSection({ graph }: { graph: HouseholdKnowledgeGraph }) {
  const top = graph.schemes.slice(0, 8);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Scheme Relationships</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {top.map((s) => (
          <div key={s.schemeId} className="flex flex-wrap items-center justify-between gap-2 rounded-md border p-3">
            <div>
              <div className="font-medium">{s.schemeName}</div>
              <div className="text-xs text-muted-foreground">
                {s.category} · {s.relatedMemberIds.length} member(s) · evidence {s.evidenceCount}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {s.goalCategories.map((g) => (
                <Badge key={g} variant="outline">{g}</Badge>
              ))}
              <Badge>{s.confidence}/100</Badge>
            </div>
          </div>
        ))}
        {top.length === 0 ? (
          <p className="text-sm text-muted-foreground">No scheme relationships detected for this household yet.</p>
        ) : null}
      </CardContent>
    </Card>
  );
}

function GoalSection({ graph }: { graph: HouseholdKnowledgeGraph }) {
  const featured = ["Education", "Entrepreneurship", "Retirement", "Healthcare"] as const;
  const found = featured.map((f) => graph.goals.find((g) => g.category === f));
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Navigator Goal Connections</CardTitle>
      </CardHeader>
      <CardContent className="grid gap-3 sm:grid-cols-2">
        {found.map((g, i) =>
          g ? (
            <div key={g.category} className="rounded-lg border p-3">
              <div className="font-semibold">{g.category}</div>
              <div className="mt-1 text-xs text-muted-foreground">
                {g.schemeIds.length} relevant schemes · {g.memberIds.length} household member(s) benefiting
              </div>
            </div>
          ) : (
            <div key={featured[i]} className="rounded-lg border border-dashed p-3 text-muted-foreground">
              <div className="font-semibold">{featured[i]}</div>
              <div className="mt-1 text-xs">No connections yet.</div>
            </div>
          ),
        )}
      </CardContent>
    </Card>
  );
}

function RiskHeatmap({ graph }: { graph: HouseholdKnowledgeGraph }) {
  const buckets = { High: 0, Moderate: 0, Low: 0 };
  for (const m of graph.members) buckets[m.riskCategory]++;
  const total = Math.max(graph.members.length, 1);
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <ShieldCheck className="size-4 text-primary" /> Welfare Risk Heatmap
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex h-6 w-full overflow-hidden rounded-md border">
          <div style={{ width: `${(buckets.High / total) * 100}%`, backgroundColor: "#e11d48" }} />
          <div style={{ width: `${(buckets.Moderate / total) * 100}%`, backgroundColor: "#d97706" }} />
          <div style={{ width: `${(buckets.Low / total) * 100}%`, backgroundColor: "#059669" }} />
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
          <LegendChip color="#e11d48" label="High Risk" value={buckets.High} />
          <LegendChip color="#d97706" label="Moderate Risk" value={buckets.Moderate} />
          <LegendChip color="#059669" label="Low Risk" value={buckets.Low} />
        </div>
      </CardContent>
    </Card>
  );
}

function LegendChip({ color, label, value }: { color: string; label: string; value: number }) {
  return (
    <div className="flex items-center gap-2 rounded-md border bg-card px-2 py-1.5">
      <span className="size-2.5 rounded-full" style={{ backgroundColor: color }} />
      <span className="font-medium">{label}</span>
      <span className="ml-auto text-muted-foreground">{value}</span>
    </div>
  );
}

function InsightsSection({ graph }: { graph: HouseholdKnowledgeGraph }) {
  const i = graph.insights;
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Research Insights</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="Avg schemes / member" value={String(i.avgSchemesPerMember)} />
          <Stat label="Avg benefits / member" value={formatINR(i.avgBenefitsPerMemberINR)} />
          <Stat label="Schemes connected" value={String(graph.schemes.length)} />
          <Stat label="Goal categories" value={String(graph.goals.length)} />
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Most connected categories
          </div>
          <div className="flex flex-wrap gap-2">
            {i.mostConnectedCategories.map((c) => (
              <Badge key={c.category} variant="outline">
                {c.category} · {c.count}
              </Badge>
            ))}
            {i.mostConnectedCategories.length === 0 ? (
              <span className="text-sm text-muted-foreground">None yet.</span>
            ) : null}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-muted-foreground">
            Members with highest missed opportunities
          </div>
          <ul className="space-y-1 text-sm">
            {i.topMissedHouseholds.map((m) => (
              <li key={m.memberName} className="flex justify-between border-b py-1">
                <span>{m.memberName}</span>
                <span className="text-muted-foreground">{m.missed} missed</span>
              </li>
            ))}
            {i.topMissedHouseholds.length === 0 ? (
              <li className="text-muted-foreground">None yet.</li>
            ) : null}
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
