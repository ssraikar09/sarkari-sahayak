import type { MetricExplainer } from "./types";

export function buildExplainers(): MetricExplainer[] {
  return [
    {
      metric: "Households positively impacted",
      formula:
        "Σ (intervention.householdsTargeted × statusCompletionFactor)",
      modules: ["Intervention Planner", "Command Center"],
      datasets: ["Resource plans", "National household analytics"],
      evidence:
        "Targets sourced from Module 21 resource plans; status weights deterministic by intervention rank.",
    },
    {
      metric: "Opportunity score uplift",
      formula:
        "min(headroom, Σ(planner.opportunityScoreLift × completionFactor)) with diminishing returns (top + 25% of rest)",
      modules: [
        "Policy Intelligence Engine",
        "Outcome Prediction Engine",
        "Intervention Planner",
      ],
      datasets: ["National opportunity score", "Forecast weights"],
      evidence:
        "Lift forecast originates in Module 21 impactForecaster; realized portion is gated by execution status.",
    },
    {
      metric: "Welfare readiness improvement",
      formula:
        "Σ(planner.welfareReadinessLift × completionFactor) capped by readiness headroom",
      modules: ["Digital Twin Simulator", "Intervention Planner"],
      datasets: ["Welfare readiness score", "Forecast weights"],
      evidence:
        "Readiness uplift inherits Module 18 simulation pathways through Module 21 forecasts.",
    },
    {
      metric: "High-risk reduction",
      formula:
        "Σ(planner.highRiskReductionPct × completionFactor) capped by current high-risk %",
      modules: [
        "Welfare Research Observatory",
        "Early Warning System",
        "Intervention Planner",
      ],
      datasets: ["Risk distribution", "Alert evidence"],
      evidence:
        "Risk reduction tied to interventions targeting categories flagged in Modules 20 and 23.",
    },
    {
      metric: "Annual benefits unlocked",
      formula:
        "Σ(forecast.annualBenefitIncreaseINR × completionFactor)",
      modules: ["Command Center", "Intervention Planner"],
      datasets: ["Benefit estimates", "Resource plans"],
      evidence:
        "Benefit values originate from Module 19 baseline and Module 21 multipliers; only executed share counts.",
    },
    {
      metric: "Regional impact distribution",
      formula:
        "stateWeight = (100 − stateOpportunityScore) / Σ(100 − stateOpportunityScore)",
      modules: ["Command Center", "Research Observatory"],
      datasets: ["State leaderboard"],
      evidence:
        "States with lower opportunity scores absorb proportionally more impact, mirroring the deterministic policy weighting.",
    },
    {
      metric: "Effectiveness score",
      formula: "impactScore × completionFactor (0..100)",
      modules: ["Intervention Planner", "Outcome Prediction Engine"],
      datasets: ["Planner impact scores"],
      evidence:
        "Combines planner-assigned impact strength with execution status to surface delivery efficiency.",
    },
  ];
}
