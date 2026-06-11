import type { InsightsSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export function generateInsightsSummary(snap: InsightsSnapshot): string[] {
  const lines: string[] = [];
  const { trends, household, utilization, risk } = snap;

  if (household.profilesAnalyzed > 0) {
    lines.push(
      `Across ${household.profilesAnalyzed} household${
        household.profilesAnalyzed === 1 ? "" : "s"
      }, the average Welfare Opportunity Score is ${household.averageOpportunityScore}/100.`,
    );
    lines.push(
      `Households leave an average of ${household.averageMissedOpportunities} eligible welfare opportunities unexplored, worth approximately ${formatINR(
        household.averageEstimatedAnnualBenefits,
      )} per year.`,
    );
  } else {
    lines.push(
      "Not enough household assessments yet to compute aggregate welfare statistics.",
    );
  }

  if (trends.searchedCategories[0]) {
    lines.push(
      `Citizens search most for ${trends.searchedCategories[0].category} schemes.`,
    );
  }
  if (trends.recommendedCategories[0]) {
    lines.push(
      `The eligibility engine most often recommends ${trends.recommendedCategories[0].category} schemes.`,
    );
  }
  if (trends.navigatorGoals[0]) {
    lines.push(
      `The most common life-goal entered into the Welfare Navigator is "${trends.navigatorGoals[0].goal}".`,
    );
  }
  if (utilization.topViewedSchemes[0]) {
    lines.push(
      `The most viewed scheme is ${utilization.topViewedSchemes[0].name}.`,
    );
  }
  if (risk.total > 0) {
    const pct = (n: number) => Math.round((n / risk.total) * 100);
    lines.push(
      `Welfare risk distribution — High: ${pct(risk.high)}%, Moderate: ${pct(
        risk.moderate,
      )}%, Low: ${pct(risk.low)}%.`,
    );
  }
  return lines;
}
