import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type { FamilyMember } from "@/lib/family-planner";
import type { WelfareGapAnalysis } from "@/lib/welfare-gap/types";
import { buildHouseholdSummaries } from "./householdMapper";
import { buildSchemeRelationships } from "./schemeRelationshipEngine";
import { buildGoalConnections } from "./navigatorConnector";
import type {
  GraphEdge,
  GraphNode,
  HouseholdKnowledgeGraph,
  ResearchInsights,
} from "./types";

export function buildKnowledgeGraph(args: {
  citizen: CitizenProfile;
  family: FamilyMember[];
  schemes: GovernmentScheme[];
  gap: WelfareGapAnalysis;
}): HouseholdKnowledgeGraph {
  const { citizen, family, schemes, gap } = args;

  const members = buildHouseholdSummaries(
    citizen.id,
    citizen.full_name,
    family,
    gap,
  );
  const schemeRels = buildSchemeRelationships(citizen, family, schemes);
  const goals = buildGoalConnections(schemeRels);

  // Nodes
  const nodes: GraphNode[] = [];
  nodes.push({
    id: `citizen:${citizen.id}`,
    kind: "citizen",
    label: citizen.full_name,
    sublabel: `${citizen.state} · ${citizen.occupation}`,
  });
  for (const m of members) {
    nodes.push({
      id: `member:${m.memberId}`,
      kind: "member",
      label: m.name,
      sublabel: m.relationship,
      meta: {
        opportunityScore: m.opportunityScore,
        eligible: m.eligibleCount,
        missed: m.missedCount,
        risk: m.riskCategory,
      },
    });
  }
  // Limit schemes for visualisation density.
  const topSchemes = schemeRels.slice(0, 30);
  for (const s of topSchemes) {
    nodes.push({
      id: `scheme:${s.schemeId}`,
      kind: "scheme",
      label: s.schemeName,
      sublabel: `${s.category} · ${s.scope}`,
      meta: { confidence: s.confidence, evidence: s.evidenceCount },
    });
  }
  for (const g of goals) {
    nodes.push({
      id: `goal:${g.category}`,
      kind: "goal",
      label: g.category,
      sublabel: `${g.schemeIds.length} scheme${g.schemeIds.length === 1 ? "" : "s"}`,
    });
  }

  // Edges
  const edges: GraphEdge[] = [];
  for (const m of members) {
    edges.push({
      id: `e:citizen-${m.memberId}`,
      from: `citizen:${citizen.id}`,
      to: `member:${m.memberId}`,
      label: m.relationship,
    });
  }
  const schemeIdsRendered = new Set(topSchemes.map((s) => s.schemeId));
  for (const s of topSchemes) {
    for (const mid of s.relatedMemberIds) {
      edges.push({
        id: `e:m-${mid}-s-${s.schemeId}`,
        from: `member:${mid}`,
        to: `scheme:${s.schemeId}`,
      });
    }
    for (const g of s.goalCategories) {
      edges.push({
        id: `e:s-${s.schemeId}-g-${g}`,
        from: `scheme:${s.schemeId}`,
        to: `goal:${g}`,
      });
    }
  }
  // Drop goal nodes that ended up orphaned after scheme truncation.
  const usedGoals = new Set(
    edges.filter((e) => e.to.startsWith("goal:")).map((e) => e.to),
  );
  for (let i = nodes.length - 1; i >= 0; i--) {
    const n = nodes[i];
    if (n.kind === "goal" && !usedGoals.has(n.id)) nodes.splice(i, 1);
  }

  const insights = computeResearchInsights(members, schemeRels);

  return {
    generatedAt: new Date().toISOString(),
    citizenLabel: citizen.full_name,
    members,
    schemes: schemeRels,
    goals,
    nodes,
    edges,
    insights,
    // expose which schemes are in the visual layer (consumed by exporter)
    ...({ _renderedSchemeIds: Array.from(schemeIdsRendered) } as object),
  } as HouseholdKnowledgeGraph;
}

function computeResearchInsights(
  members: HouseholdKnowledgeGraph["members"],
  schemes: HouseholdKnowledgeGraph["schemes"],
): ResearchInsights {
  const catCount = new Map<string, number>();
  for (const s of schemes)
    catCount.set(s.category, (catCount.get(s.category) ?? 0) + 1);
  const mostConnectedCategories = Array.from(catCount.entries())
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);

  const topMissedHouseholds = [...members]
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 5)
    .map((m) => ({ memberName: m.name, missed: m.missedCount }));

  const total = Math.max(members.length, 1);
  const avgSchemesPerMember = Math.round(
    members.reduce((s, m) => s + m.eligibleCount, 0) / total,
  );
  const avgBenefitsPerMemberINR = Math.round(
    members.reduce((s, m) => s + m.estimatedAnnualBenefitINR, 0) / total,
  );

  return {
    mostConnectedCategories,
    topMissedHouseholds,
    avgSchemesPerMember,
    avgBenefitsPerMemberINR,
  };
}
