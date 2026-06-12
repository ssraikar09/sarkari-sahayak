import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  HouseholdArchetype,
  ResearchFinding,
  ResearchSnapshotMetrics,
  TrendObservatory,
} from "./types";

/**
 * Deterministic confidence: scales with sample size of the studied population.
 * - high     : ≥ 30 households
 * - moderate : ≥ 10 households
 * - low      : < 10 households
 */
function sampleConfidence(n: number): {
  level: "high" | "moderate" | "low";
  explanation: string;
} {
  if (n >= 30) {
    return {
      level: "high",
      explanation: `Computed across ${n} household assessments — sample size exceeds the 30-household threshold for high confidence.`,
    };
  }
  if (n >= 10) {
    return {
      level: "moderate",
      explanation: `Based on ${n} household assessments. Directionally reliable; precision improves above 30 households.`,
    };
  }
  return {
    level: "low",
    explanation: `Only ${n} household assessments available. Treat as indicative until more data is collected.`,
  };
}

export function generateFindings(input: {
  metrics: ResearchSnapshotMetrics;
  trends: TrendObservatory;
  archetypes: HouseholdArchetype[];
}): ResearchFinding[] {
  const out: ResearchFinding[] = [];
  const { metrics, trends, archetypes } = input;
  const conf = sampleConfidence(metrics.householdsStudied);

  if (metrics.householdsStudied > 0) {
    out.push({
      id: "exclusion-share",
      title: `${metrics.highRiskSharePercent}% of studied households are at high welfare risk`,
      narrative: `Across ${metrics.householdsStudied} household assessments, ${metrics.highRiskSharePercent}% have opportunity scores below 40, indicating significant unrealised welfare entitlements.`,
      magnitude: `${metrics.highRiskSharePercent}% high-risk`,
      contributingModules: ["Module 6 · Welfare Gap Analyzer", "Module 16 · Policy Intelligence Engine"],
      datasets: ["eligibility_assessments", "application_guide_usage", "navigator_usage_logs"],
      category: "risk",
      confidence: conf.level,
      confidenceExplanation: conf.explanation,
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
      confidence: conf.level,
      confidenceExplanation: `${conf.explanation} Category ranking reflects ${topMissed.count} verified missed-opportunity events.`,
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
      confidence: worstGap.eligible >= 20 ? "high" : worstGap.eligible >= 8 ? "moderate" : "low",
      confidenceExplanation: `Derived from ${worstGap.eligible} eligibility exposures cross-referenced with engagement logs.`,
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
      contributingModules: ["Module 5 · Family Planner", "Module 17 · Outcome Prediction", "Module 20 · Research Observatory"],
      datasets: ["citizen_profiles", "eligibility_assessments"],
      category: "demographic",
      confidence: topArchetype.households >= 10 ? "high" : topArchetype.households >= 4 ? "moderate" : "low",
      confidenceExplanation: `Archetype match validated against ${topArchetype.households} citizen profiles using deterministic signals.`,
    });
  }

  const benefitConc = trends.benefitConcentration[0];
  if (benefitConc) {
    out.push({
      id: "benefit-concentration",
      title: `${benefitConc.label} concentrates ${Math.round(benefitConc.share * 100)}% of unrealised benefits`,
      narrative: `Benefit pool analysis shows that the ${benefitConc.label} category alone accounts for ${formatINR(benefitConc.value)} of the missed-benefit total — the highest single-category concentration on the platform.`,
      magnitude: `${Math.round(benefitConc.share * 100)}% share`,
      contributingModules: ["Module 6 · Welfare Gap Analyzer", "Module 17 · Outcome Prediction", "Module 18 · Digital Twin Simulator"],
      datasets: ["government_schemes", "eligibility_assessments"],
      category: "opportunity",
      confidence: conf.level,
      confidenceExplanation: `${conf.explanation} Concentration share computed from verified benefit estimates.`,
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
      confidence: conf.level,
      confidenceExplanation: conf.explanation,
    });
  }

  const nav = trends.navigatorAdoption;
  if (nav && nav.householdsEngaged > 0) {
    out.push({
      id: "navigator-adoption",
      title: `Navigator adoption reaches ${nav.adoptionPercent}% of studied households`,
      narrative: `${nav.householdsEngaged} of ${metrics.householdsStudied} households have used the welfare navigator at least once, generating ${nav.totalInteractions} goal interactions${nav.topGoals[0] ? ` led by "${nav.topGoals[0].goal}"` : ""}.`,
      magnitude: `${nav.adoptionPercent}% adoption`,
      contributingModules: ["Module 8 · Welfare Navigator", "Module 18 · Digital Twin Simulator"],
      datasets: ["navigator_usage_logs"],
      category: "utilization",
      confidence: nav.totalInteractions >= 25 ? "high" : nav.totalInteractions >= 10 ? "moderate" : "low",
      confidenceExplanation: `Adoption rate computed from ${nav.totalInteractions} verified navigator interactions.`,
    });
  }

  return out;
}
