import { riskFor, scoreFor, sumBenefits } from "./predictionEngine";
import { SCENARIOS, simulateScenario } from "./scenarioSimulator";
import { buildExplainers } from "./explainability";
import type {
  CategoryImpact,
  HouseholdOutcome,
  HouseholdScenarioOutcome,
  OutcomePredictionSnapshot,
  ScenarioForecast,
  ScenarioId,
  SummaryDashboard,
} from "./types";

export type HouseholdInput = {
  profileId: string;
  fullName: string;
  state: string;
  eligible: string[];
  exploredAlready: Set<string>;
  navigatorRecommended: Set<string>;
};

export type ForecastInputs = {
  households: HouseholdInput[];
  benefitByScheme: Map<string, number>;
  categoryByScheme: Map<string, string>;
  generatedAt: string;
};

const EMPTY_SUMMARY: SummaryDashboard = {
  households: 0,
  currentAverageScore: 0,
  predictedAverageScore: 0,
  currentAverageBenefitsINR: 0,
  predictedAverageBenefitsINR: 0,
  currentHighRisk: 0,
  predictedHighRisk: 0,
  currentHighRiskPct: 0,
  predictedHighRiskPct: 0,
};

export function generateForecast(input: ForecastInputs): OutcomePredictionSnapshot {
  const { households, benefitByScheme, categoryByScheme, generatedAt } = input;

  if (households.length === 0) {
    return {
      summary: EMPTY_SUMMARY,
      scenarios: [],
      households: [],
      research: {
        averagePredictedBenefitGainINR: 0,
        averagePredictedRiskReductionPct: 0,
        mostImpactfulCategories: [],
      },
      explainers: [],
      generatedAt,
      hasSufficientData: false,
    };
  }

  const householdOutcomes: HouseholdOutcome[] = [];

  // Aggregators
  let curScoreSum = 0;
  let curBenefitsSum = 0;
  let curHighRisk = 0;

  // Per-scenario aggregators
  const scenarioAgg: Record<
    ScenarioId,
    {
      scoreSum: number;
      benefitsSum: number;
      missedReductionSum: number;
      affected: number;
      readinessLifted: number; // households that moved out of high risk
      predictedHighRisk: number;
    }
  > = {
    top3: empty(),
    all: empty(),
    navigator: empty(),
    documentation: empty(),
  };

  const categoryGain = new Map<
    string,
    { gain: number; households: Set<string> }
  >();

  for (const h of households) {
    const eligibleCount = h.eligible.length;
    const exploredCount = h.eligible.filter((id) => h.exploredAlready.has(id))
      .length;
    const missedCount = eligibleCount - exploredCount;
    const currentScore = scoreFor(eligibleCount, exploredCount);
    const currentBenefits = sumBenefits(
      h.eligible.filter((id) => h.exploredAlready.has(id)),
      benefitByScheme,
    );
    const currentRisk = riskFor(currentScore);

    curScoreSum += currentScore;
    curBenefitsSum += currentBenefits;
    if (currentRisk === "high") curHighRisk += 1;

    const scenarios: HouseholdScenarioOutcome[] = [];

    for (const meta of SCENARIOS) {
      const explored = simulateScenario(meta.id, {
        eligible: h.eligible,
        exploredAlready: h.exploredAlready,
        navigatorRecommended: h.navigatorRecommended,
        benefitByScheme,
      });
      const predictedExploredCount = h.eligible.filter((id) =>
        explored.has(id),
      ).length;
      const predictedScore = scoreFor(eligibleCount, predictedExploredCount);
      const predictedBenefits = sumBenefits(
        h.eligible.filter((id) => explored.has(id)),
        benefitByScheme,
      );
      const predictedRisk = riskFor(predictedScore);

      const outcome: HouseholdScenarioOutcome = {
        scenarioId: meta.id,
        predictedExploredCount,
        predictedScore,
        predictedBenefitsINR: predictedBenefits,
        predictedRisk,
        scoreDelta: predictedScore - currentScore,
        benefitsDeltaINR: predictedBenefits - currentBenefits,
        missedReduction: predictedExploredCount - exploredCount,
        riskImproved: currentRisk === "high" && predictedRisk !== "high",
      };
      scenarios.push(outcome);

      const a = scenarioAgg[meta.id];
      a.scoreSum += predictedScore;
      a.benefitsSum += predictedBenefits;
      a.missedReductionSum += outcome.missedReduction;
      if (outcome.missedReduction > 0) a.affected += 1;
      if (outcome.riskImproved) a.readinessLifted += 1;
      if (predictedRisk === "high") a.predictedHighRisk += 1;
    }

    // Category impact derived from the "all" scenario (full gain potential)
    const allOutcome = scenarios.find((s) => s.scenarioId === "all")!;
    if (allOutcome.benefitsDeltaINR > 0) {
      const missedIds = h.eligible.filter((id) => !h.exploredAlready.has(id));
      for (const id of missedIds) {
        const cat = categoryByScheme.get(id) ?? "Other";
        const v = benefitByScheme.get(id) ?? 0;
        if (v <= 0) continue;
        if (!categoryGain.has(cat))
          categoryGain.set(cat, { gain: 0, households: new Set() });
        const rec = categoryGain.get(cat)!;
        rec.gain += v;
        rec.households.add(h.profileId);
      }
    }

    householdOutcomes.push({
      snapshot: {
        profileId: h.profileId,
        fullName: h.fullName,
        state: h.state,
        eligibleCount,
        exploredCount,
        missedCount,
        currentScore,
        currentBenefitsINR: currentBenefits,
        currentRisk,
      },
      scenarios,
    });
  }

  const n = households.length;
  const summary: SummaryDashboard = {
    households: n,
    currentAverageScore: Math.round(curScoreSum / n),
    predictedAverageScore: Math.round(scenarioAgg.all.scoreSum / n),
    currentAverageBenefitsINR: Math.round(curBenefitsSum / n),
    predictedAverageBenefitsINR: Math.round(scenarioAgg.all.benefitsSum / n),
    currentHighRisk: curHighRisk,
    predictedHighRisk: scenarioAgg.all.predictedHighRisk,
    currentHighRiskPct: Math.round((curHighRisk / n) * 100),
    predictedHighRiskPct: Math.round((scenarioAgg.all.predictedHighRisk / n) * 100),
  };

  const scenarios: ScenarioForecast[] = SCENARIOS.map((meta) => {
    const a = scenarioAgg[meta.id];
    return {
      id: meta.id,
      label: meta.label,
      description: meta.description,
      actions: meta.actions,
      predictedAverageScore: Math.round(a.scoreSum / n),
      predictedAverageBenefitsINR: Math.round(a.benefitsSum / n),
      averageScoreLift: Math.round(a.scoreSum / n - summary.currentAverageScore),
      averageBenefitLiftINR: Math.round(
        a.benefitsSum / n - summary.currentAverageBenefitsINR,
      ),
      averageMissedReduction: round1(a.missedReductionSum / n),
      readinessLiftPct: Math.round((a.readinessLifted / n) * 100),
      affectedHouseholds: a.affected,
    };
  });

  const benefitGainPerHousehold =
    summary.predictedAverageBenefitsINR - summary.currentAverageBenefitsINR;
  const riskReductionPct = Math.max(
    0,
    summary.currentHighRiskPct - summary.predictedHighRiskPct,
  );

  const mostImpactfulCategories: CategoryImpact[] = [...categoryGain.entries()]
    .map(([category, v]) => ({
      category,
      predictedBenefitGainINR: Math.round(v.gain),
      affectedHouseholds: v.households.size,
    }))
    .sort((a, b) => b.predictedBenefitGainINR - a.predictedBenefitGainINR)
    .slice(0, 6);

  const explainers = buildExplainers({
    summary,
    scenarios,
    mostImpactfulCategories,
    benefitGainPerHousehold,
    riskReductionPct,
  });

  return {
    summary,
    scenarios,
    households: householdOutcomes,
    research: {
      averagePredictedBenefitGainINR: benefitGainPerHousehold,
      averagePredictedRiskReductionPct: riskReductionPct,
      mostImpactfulCategories,
    },
    explainers,
    generatedAt,
    hasSufficientData: true,
  };
}

function empty() {
  return {
    scoreSum: 0,
    benefitsSum: 0,
    missedReductionSum: 0,
    affected: 0,
    readinessLifted: 0,
    predictedHighRisk: 0,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
