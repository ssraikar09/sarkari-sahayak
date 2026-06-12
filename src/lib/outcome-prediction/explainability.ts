import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type {
  CategoryImpact,
  Explainer,
  ScenarioForecast,
  SummaryDashboard,
} from "./types";

const SOURCES = {
  eligibility: "Module 2 — Eligibility Assessments",
  navigator: "Module 5 — Welfare Navigator Logs",
  guides: "Module 6 — Application Guide Usage",
  welfareGap: "Module 1 — Welfare Gap Analytics",
  benefits: "Module 1 — Benefit Value Estimator",
};

export function buildExplainers(input: {
  summary: SummaryDashboard;
  scenarios: ScenarioForecast[];
  mostImpactfulCategories: CategoryImpact[];
  benefitGainPerHousehold: number;
  riskReductionPct: number;
}): Explainer[] {
  const { summary, scenarios, mostImpactfulCategories, benefitGainPerHousehold, riskReductionPct } =
    input;
  const out: Explainer[] = [];

  out.push({
    id: "score-lift",
    prediction: `Average Welfare Opportunity Score can rise from ${summary.currentAverageScore} → ${summary.predictedAverageScore}.`,
    rationale:
      "Score is the share of eligible schemes a household has explored. Acting on every eligible scheme raises the explored ratio to 100%, lifting the mean across all analyzed households.",
    actions: [
      "Households apply to all eligible schemes",
      "Application guides drive exploration of missed schemes",
      "Navigator plans convert recommendations into actions",
    ],
    sources: [SOURCES.welfareGap, SOURCES.eligibility, SOURCES.guides],
  });

  out.push({
    id: "benefit-gain",
    prediction: `Estimated annual benefits per household can grow by ${formatINR(
      benefitGainPerHousehold,
    )}.`,
    rationale:
      "Each missed eligible scheme has a deterministic estimated annual value. Summing those values per household and averaging produces the projected benefit lift.",
    actions: [
      "Identify highest-value missed schemes per household",
      "Sequence applications by benefit impact",
      "Track unlocked benefits through completed applications",
    ],
    sources: [SOURCES.benefits, SOURCES.eligibility],
  });

  out.push({
    id: "risk-reduction",
    prediction: `High welfare-risk share can fall by ${riskReductionPct} percentage points (${summary.currentHighRiskPct}% → ${summary.predictedHighRiskPct}%).`,
    rationale:
      "Households move out of the high-risk tier when their opportunity score crosses 40. Predicting the score under each scenario lets us deterministically count how many cross that threshold.",
    actions: [
      "Prioritize high-risk households for navigator support",
      "Bundle multiple low-friction schemes per household",
      "Improve documentation readiness to unlock pending applications",
    ],
    sources: [SOURCES.welfareGap, SOURCES.navigator],
  });

  const best = [...scenarios].sort(
    (a, b) => b.averageBenefitLiftINR - a.averageBenefitLiftINR,
  )[0];
  if (best) {
    out.push({
      id: "best-scenario",
      prediction: `“${best.label}” is the highest-impact scenario — projected lift of ${formatINR(
        best.averageBenefitLiftINR,
      )} per household.`,
      rationale: best.description,
      actions: best.actions,
      sources: [SOURCES.welfareGap, SOURCES.benefits, SOURCES.navigator],
    });
  }

  if (mostImpactfulCategories.length > 0) {
    const top = mostImpactfulCategories[0];
    out.push({
      id: "category-impact",
      prediction: `“${top.category}” schemes hold the largest unrealized benefit pool — about ${formatINR(
        top.predictedBenefitGainINR,
      )} across ${top.affectedHouseholds} household(s).`,
      rationale:
        "Category impact is computed by summing the estimated annual value of missed eligible schemes per category, then ranking categories descending.",
      actions: [
        `Prioritize policy interventions and outreach in ${top.category}`,
        "Pre-validate documentation requirements for this category",
        "Bundle category-specific applications in Navigator plans",
      ],
      sources: [SOURCES.benefits, SOURCES.eligibility],
    });
  }

  return out;
}
