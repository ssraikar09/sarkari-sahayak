import { LEVERS, ZERO_LEVERS } from "./presets";
import type {
  DigitalTwinBaseline,
  DigitalTwinForecast,
  DigitalTwinHousehold,
  LeverContribution,
  LeverId,
  Levers,
  RiskDistribution,
} from "./types";

/**
 * Deterministic forecast — no randomness, no time inputs.
 *
 * Per household h:
 *   baseRatio  = h.explored / h.eligible
 *   navRatio   = h.navigatorEligible / h.eligible
 *   l_norm     = lever / 100  ∈ [0,1]
 *
 *   uplift = Σ weight_i * l_i_norm                          // 0..1
 *          + 0.10 * navRatio * l_navigatorAdoption_norm     // adoption bonus tied to navigator coverage
 *
 *   newRatio = min(1, baseRatio + (1 - baseRatio) * uplift)
 *   newExplored = round(newRatio * eligible)
 *
 * Benefits added = sum of top-(newExplored - explored) missed schemes by value
 * (already sorted DESC in baseline).
 *
 * Risk tiers reuse Module 1 thresholds:
 *   high: score < 40, moderate: 40..74, low: ≥ 75.
 *
 * Readiness score = round(0.6 * avgScore + 0.4 * (100 - highRiskPct)).
 */

export function leverEffect(levers: Levers): number {
  let e = 0;
  for (const meta of LEVERS) e += meta.weight * (levers[meta.id] / 100);
  return Math.max(0, Math.min(1, e));
}

function riskTier(score: number): "high" | "moderate" | "low" {
  if (score < 40) return "high";
  if (score < 75) return "moderate";
  return "low";
}

function tally(scores: number[]): RiskDistribution {
  const r: RiskDistribution = { high: 0, moderate: 0, low: 0 };
  for (const s of scores) r[riskTier(s)] += 1;
  return r;
}

function readiness(avgScore: number, highRiskPct: number): number {
  return Math.round(0.6 * avgScore + 0.4 * (100 - highRiskPct));
}

type HouseholdSim = {
  score: number;
  benefits: number;
  missed: number;
  ratio: number;
  navUsed: boolean;
};

function simulateHousehold(
  h: DigitalTwinHousehold,
  levers: Levers,
): HouseholdSim {
  if (h.eligible <= 0) {
    return { score: 0, benefits: 0, missed: 0, ratio: 0, navUsed: false };
  }
  const baseRatio = h.explored / h.eligible;
  const navRatio = h.navigatorEligible / h.eligible;
  const baseEffect = leverEffect(levers);
  const navBonus = 0.1 * navRatio * (levers.navigatorAdoption / 100);
  const uplift = Math.max(0, Math.min(1, baseEffect + navBonus));
  const newRatio = Math.min(1, baseRatio + (1 - baseRatio) * uplift);

  const newExplored = Math.round(newRatio * h.eligible);
  const addCount = Math.max(0, newExplored - h.explored);
  const addedBenefits = h.rankedMissedBenefits
    .slice(0, addCount)
    .reduce((a, b) => a + b, 0);

  const score = Math.round(newRatio * 100);
  return {
    score,
    benefits: h.exploredBenefitsINR + addedBenefits,
    missed: Math.max(0, h.eligible - newExplored),
    ratio: newRatio,
    navUsed: levers.navigatorAdoption > 0 && h.navigatorEligible > 0,
  };
}

function aggregate(
  households: DigitalTwinHousehold[],
  levers: Levers,
) {
  const scores: number[] = [];
  let benefitsSum = 0;
  let missedSum = 0;
  let navHouseholds = 0;
  let exploredSum = 0;
  let eligibleSum = 0;

  for (const h of households) {
    const sim = simulateHousehold(h, levers);
    scores.push(sim.score);
    benefitsSum += sim.benefits;
    missedSum += sim.missed;
    if (sim.navUsed) navHouseholds += 1;
    exploredSum += Math.round(sim.ratio * h.eligible);
    eligibleSum += h.eligible;
  }

  const n = households.length || 1;
  const avgScore = Math.round(scores.reduce((a, b) => a + b, 0) / n);
  const risk = tally(scores);
  const highRiskPct = Math.round((risk.high / n) * 100);

  return {
    avgScore,
    avgBenefits: Math.round(benefitsSum / n),
    avgMissed: Math.round((missedSum / n) * 10) / 10,
    highRiskPct,
    readiness: readiness(avgScore, highRiskPct),
    navAdoptionPct: Math.round((navHouseholds / n) * 100),
    csCoverageProxyPct:
      eligibleSum > 0 ? Math.round((exploredSum / eligibleSum) * 100) : 0,
    risk,
  };
}

export function runForecast(
  baseline: DigitalTwinBaseline,
  levers: Levers,
): DigitalTwinForecast {
  const current = aggregate(baseline.households, ZERO_LEVERS);
  const simulated = aggregate(baseline.households, levers);

  // Lever contribution breakdown — re-run with each single lever isolated
  const contributions: LeverContribution[] = [];
  let totalScoreLift = 0;
  let totalBenefitLift = 0;
  const partials: { id: LeverId; label: string; score: number; benefit: number }[] = [];

  for (const meta of LEVERS) {
    const solo: Levers = { ...ZERO_LEVERS, [meta.id]: levers[meta.id] };
    const out = aggregate(baseline.households, solo);
    const score = Math.max(0, out.avgScore - current.avgScore);
    const benefit = Math.max(0, out.avgBenefits - current.avgBenefits);
    totalScoreLift += score;
    totalBenefitLift += benefit;
    partials.push({ id: meta.id, label: meta.short, score, benefit });
  }

  for (const p of partials) {
    const denom = totalScoreLift + totalBenefitLift;
    const num = p.score + p.benefit / Math.max(1, baseline.totals.averageAnnualBenefitsINR || 1) * (totalScoreLift || 1);
    contributions.push({
      id: p.id,
      label: p.label,
      contributionPct:
        denom > 0 ? Math.round((Math.max(0, num) / denom) * 100) : 0,
      scoreLift: p.score,
      benefitLiftINR: p.benefit,
    });
  }
  // Normalize contributions to sum to 100 deterministically
  const sumC = contributions.reduce((a, c) => a + c.contributionPct, 0);
  if (sumC > 0) {
    let running = 0;
    for (let i = 0; i < contributions.length - 1; i++) {
      contributions[i].contributionPct = Math.round(
        (contributions[i].contributionPct / sumC) * 100,
      );
      running += contributions[i].contributionPct;
    }
    contributions[contributions.length - 1].contributionPct = Math.max(
      0,
      100 - running,
    );
  }

  // Trajectory — step from 0..100% application of selected levers (deterministic)
  const trajectory: DigitalTwinForecast["trajectory"] = [];
  const benefitProjection: DigitalTwinForecast["benefitProjection"] = [];
  for (let step = 0; step <= 10; step++) {
    const scale = step / 10;
    const scaled: Levers = {
      awareness: levers.awareness * scale,
      csc: levers.csc * scale,
      documentation: levers.documentation * scale,
      navigatorAdoption: levers.navigatorAdoption * scale,
      completion: levers.completion * scale,
    };
    const a = aggregate(baseline.households, scaled);
    trajectory.push({
      step: step * 10,
      score: a.avgScore,
      readiness: a.readiness,
      risk: a.highRiskPct,
    });
    benefitProjection.push({ step: step * 10, benefitINR: a.avgBenefits });
  }

  return {
    levers,
    simulated: {
      averageOpportunityScore: simulated.avgScore,
      averageMissedOpportunities: simulated.avgMissed,
      averageAnnualBenefitsINR: simulated.avgBenefits,
      highRiskPct: simulated.highRiskPct,
      welfareReadinessScore: simulated.readiness,
      navigatorAdoptionPct: simulated.navAdoptionPct,
      csCoverageProxyPct: simulated.csCoverageProxyPct,
    },
    deltas: {
      opportunityScore: simulated.avgScore - current.avgScore,
      missedReduction:
        Math.round((current.avgMissed - simulated.avgMissed) * 10) / 10,
      benefitGainINR: simulated.avgBenefits - current.avgBenefits,
      riskReductionPct: current.highRiskPct - simulated.highRiskPct,
      readinessLift: simulated.readiness - current.readiness,
    },
    currentRisk: current.risk,
    simulatedRisk: simulated.risk,
    contributions,
    trajectory,
    benefitProjection,
    generatedAt: baseline.generatedAt,
  };
}
