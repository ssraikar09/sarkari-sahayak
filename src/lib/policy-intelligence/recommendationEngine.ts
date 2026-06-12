import type {
  CategoryCount,
  GroupExclusion,
  PolicyRecommendation,
  StateDemandRow,
  StateRiskRow,
  UnderutilizedScheme,
} from "./types";

export function generateRecommendations(input: {
  topMissedCategories: CategoryCount[];
  underservedGroups: GroupExclusion[];
  underutilizedSchemes: UnderutilizedScheme[];
  stateRisk: StateRiskRow[];
  stateDemand: StateDemandRow[];
}): PolicyRecommendation[] {
  const recs: PolicyRecommendation[] = [];

  // 1. Category gap
  for (const cat of input.topMissedCategories.slice(0, 2)) {
    recs.push({
      id: `cat-${cat.category}`,
      title: `${cat.category} schemes show the highest unmet welfare demand`,
      rationale: `${cat.category} schemes appear most often in the eligible-but-unexplored set across analyzed households.`,
      evidence: [
        `${cat.count} missed-scheme occurrences in this category across households.`,
      ],
      sources: ["eligibility_assessments", "welfare gap intelligence"],
      priority: "high",
    });
  }

  // 2. Underserved groups
  for (const g of input.underservedGroups.slice(0, 2)) {
    if (g.averageOpportunityScore >= 70) continue;
    recs.push({
      id: `group-${g.group}`,
      title: `${g.group} households need targeted welfare outreach`,
      rationale: `${g.group} households show an average Opportunity Score of ${g.averageOpportunityScore}/100 with ${g.averageMissed} missed opportunities on average.`,
      evidence: [
        `${g.affectedHouseholds} household${g.affectedHouseholds === 1 ? "" : "s"} classified in this group.`,
        `Average missed schemes: ${g.averageMissed}.`,
      ],
      sources: ["citizen_profiles", "eligibility_assessments"],
      priority: g.averageOpportunityScore < 40 ? "high" : "medium",
    });
  }

  // 3. Underutilized schemes
  for (const s of input.underutilizedSchemes.slice(0, 2)) {
    const pct = Math.round(s.utilizationRate * 100);
    recs.push({
      id: `scheme-${s.id}`,
      title: `${s.name} is widely eligible but rarely explored`,
      rationale: `Only ${pct}% of eligible households have explored ${s.name}, indicating an awareness or access gap.`,
      evidence: [
        `${s.eligibleCount} eligible households, ${s.exploredCount} explored.`,
        `Category: ${s.category}.`,
      ],
      sources: ["application_guide_usage", "navigator_usage_logs"],
      priority: pct < 20 ? "high" : "medium",
    });
  }

  // 4. Regional demand
  for (const r of input.stateDemand.slice(0, 2)) {
    if (r.topCategory === "—") continue;
    recs.push({
      id: `region-${r.state}`,
      title: `${r.topCategory} schemes exhibit high demand in ${r.state}`,
      rationale: `${r.state} shows ${r.totalInteractions} welfare interactions concentrated around ${r.topCategory}.`,
      evidence: [
        `Top searched/recommended category: ${r.topCategory}.`,
        `Top navigator goal: ${r.topGoal}.`,
      ],
      sources: ["scheme_search_logs", "navigator_usage_logs", "assistant_queries"],
      priority: "medium",
    });
  }

  // 5. Regional risk
  for (const r of input.stateRisk.slice(0, 2)) {
    const highPct = r.households ? Math.round((r.high / r.households) * 100) : 0;
    if (highPct < 30) continue;
    recs.push({
      id: `risk-${r.state}`,
      title: `${r.state} shows elevated welfare exclusion risk`,
      rationale: `${highPct}% of analyzed households in ${r.state} fall into the high-risk welfare exclusion tier.`,
      evidence: [
        `${r.households} household${r.households === 1 ? "" : "s"} analyzed in ${r.state}.`,
        `Average Opportunity Score: ${r.averageOpportunityScore}/100.`,
      ],
      sources: ["eligibility_assessments", "decision engine outputs"],
      priority: "high",
    });
  }

  return recs;
}
