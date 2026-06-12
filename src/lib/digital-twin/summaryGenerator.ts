import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import { LEVERS } from "./presets";
import type { DigitalTwinBaseline, DigitalTwinForecast } from "./types";

export function generateNarrative(
  baseline: DigitalTwinBaseline,
  forecast: DigitalTwinForecast,
): string {
  if (!baseline.totals.households) {
    return "No households analysed yet — once eligibility assessments are recorded the Digital Twin will produce evidence-based projections.";
  }

  const activeLevers = LEVERS.filter((l) => forecast.levers[l.id] > 0)
    .sort((a, b) => forecast.levers[b.id] - forecast.levers[a.id])
    .slice(0, 2);

  if (activeLevers.length === 0) {
    return `At baseline ${baseline.totals.households} households show an average welfare opportunity score of ${baseline.totals.averageOpportunityScore}/100 with ${baseline.totals.highRiskPct}% in the high-risk tier. Move any intervention lever above zero to project the impact.`;
  }

  const lead = activeLevers
    .map((l) => `a ${forecast.levers[l.id]}% increase in ${l.short.toLowerCase()}`)
    .join(" combined with ");

  const scorePart =
    forecast.deltas.opportunityScore > 0
      ? `lift the average opportunity score by ${forecast.deltas.opportunityScore} points (to ${forecast.simulated.averageOpportunityScore}/100)`
      : "leave the average opportunity score unchanged";

  const riskPart =
    forecast.deltas.riskReductionPct > 0
      ? `reduce welfare exclusion by ${forecast.deltas.riskReductionPct} percentage points`
      : "hold the high-risk share steady";

  const benefitPart =
    forecast.deltas.benefitGainINR > 0
      ? `and unlock an additional ${formatINR(forecast.deltas.benefitGainINR)} in average annual benefits per household`
      : "";

  return `Across ${baseline.totals.households} analysed households, ${lead} may ${scorePart}, ${riskPart}${benefitPart ? ", " + benefitPart : ""}. Forecast is deterministic — derived from existing eligibility, navigator, and CSC analytics with no randomness.`;
}
