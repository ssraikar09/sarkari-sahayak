import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  HouseholdArchetype,
  ResearchFinding,
  ResearchSnapshotMetrics,
  TrendObservatory,
} from "./types";

export function generateFindings(input: {
  metrics: ResearchSnapshotMetrics;
  trends: TrendObservatory;
  archetypes: HouseholdArchetype[];
}): ResearchFinding[] {
  const out: ResearchFinding[] = [];
  const { metrics, trends, archetypes } = input;

  if (metrics.householdsStudied > 0) {
    out.push({
      id: "exclusion-share",
      title: `${metrics.highRiskSharePercent}% of studied households are at high welfare risk`,
      narrative: `Across ${metrics.householdsStudied} household assessments, ${metrics.highRiskSharePercent}% have opportunity scores below 40, indicating significant unrealised welfare entitlements.`,
      magnitude: `${metrics.highRiskSharePercent}% high-risk`,
      contributingModules: ["Module 6 · Welfare Gap Analyzer", "Module 16 · Policy Intelligence Engine"],
      datasets: ["eligibility_assessments", "application_guide_usage", "navigator_usage_logs"],
      category: "risk",
    });
  }

  const topMissed = trends.missedByCategory[0];
  if (topMissed) {
    out.push({
      id: "category-gap",
      title: `${topMissed.category} accounts for the largest share of missed welfare opportunities`,
      narrative: `${topMissed.percent}% of recorded missed opportunities map to ${topMissed.category} schemes, suggesting targeted outreach in this category will produce the highest national lift.`,
      magnitude: `${topMissed.count} missed instances`,
      contributingModules: ["Module 11 · Research Insights", "Module 16 · Policy Intelligence Engine"],
      datasets: ["government_schemes", "eligibility_assessments"],
      category: "exclusion",
    });
  }

  const worstGap = [...trends.utilizationGaps].sort((a, b) => b.gapPercent - a.gapPercent)[0];
  if (worstGap && worstGap.eligible > 0) {
    out.push({
      id: "utilization-gap",
      title: `${worstGap.category} schemes are utilised by only ${100 - worstGap.gapPercent}% of eligible households`,
      narrative: `Out of ${worstGap.eligible} eligible exposures, only ${worstGap.explored} were explored. A ${worstGap.gapPercent}% utilisation gap remains across the ${worstGap.category} category.`,
      magnitude: `${worstGap.gapPercent}% utilisation gap`,
      contributingModules: ["Module 16 · Policy Intelligence Engine", "Module 19 · National Command Center"],
      datasets: ["application_guide_usage", "navigator_usage_logs"],
      category: "utilization",
    });
  }

  const topArchetype = [...archetypes].sort(
    (a, b) => b.potentialBenefitPoolINR - a.potentialBenefitPoolINR,
  )[0];
  if (topArchetype && topArchetype.households > 0) {
    out.push({
      id: "archetype-leverage",
      title: `${topArchetype.name} segment holds ${formatINR(topArchetype.potentialBenefitPoolINR)} in unrealised annual benefits`,
      narrative: `${topArchetype.households} households match the ${topArchetype.name} archetype, representing the largest deterministic benefit pool available for targeted intervention.`,
      magnitude: formatINR(topArchetype.potentialBenefitPoolINR),
      contributingModules: ["Module 5 · Family Planner", "Module 20 · Research Observatory"],
      datasets: ["citizen_profiles", "eligibility_assessments"],
      category: "demographic",
    });
  }

  const benefitConc = trends.benefitConcentration[0];
  if (benefitConc) {
    out.push({
      id: "benefit-concentration",
      title: `${benefitConc.label} concentrates ${Math.round(benefitConc.share * 100)}% of unrealised benefits`,
      narrative: `Benefit pool analysis shows that the ${benefitConc.label} category alone accounts for ${formatINR(benefitConc.value)} of the missed-benefit total — the highest single-category concentration on the platform.`,
      magnitude: `${Math.round(benefitConc.share * 100)}% share`,
      contributingModules: ["Module 6 · Welfare Gap Analyzer", "Module 17 · Outcome Prediction"],
      datasets: ["government_schemes", "eligibility_assessments"],
      category: "opportunity",
    });
  }

  if (metrics.averageOpportunityScore > 0) {
    out.push({
      id: "average-opportunity",
      title: `Average household opportunity score sits at ${metrics.averageOpportunityScore}/100`,
      narrative: `Across the studied population, average opportunity capture is ${metrics.averageOpportunityScore}/100, with mean projected annual benefit of ${formatINR(metrics.averageProjectedBenefitINR)} per household.`,
      magnitude: `${metrics.averageOpportunityScore}/100`,
      contributingModules: ["Module 6 · Welfare Gap Analyzer", "Module 11 · Research Insights"],
      datasets: ["eligibility_assessments", "navigator_usage_logs"],
      category: "opportunity",
    });
  }

  return out;
}
