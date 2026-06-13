import type { ObservatoryExplainer } from "./types";

export function buildExplainers(): ObservatoryExplainer[] {
  return [
    {
      insight: "National Welfare Snapshot",
      modules: ["Module 5 Eligibility", "Module 16 Policy Intelligence", "Module 19 Digital Twin"],
      datasets: ["National overview", "State leaderboard", "Risk distribution"],
      rules: [
        "summary.opportunityScore = round(avg(household.opportunityScore))",
        "summary.highRiskHouseholds = round(highRiskPercentage × householdsAnalyzed / 100)",
      ],
      evidence: "Aggregated from deterministic household assessments and policy analytics.",
    },
    {
      insight: "Welfare Lifecycle Observatory",
      modules: ["Modules 1–24"],
      datasets: ["Module snapshots referenced per stage"],
      rules: ["lifecycle.stage.metric = derived from authoritative module snapshot"],
      evidence: "Each stage references the original module output without transformation.",
    },
    {
      insight: "National Intelligence Summary",
      modules: ["Modules 16–24"],
      datasets: ["Leaderboards", "Planner forecasts", "Warning trends"],
      rules: [
        "underserved = argmin(state.opportunityScore)",
        "highImpact = argmax(intervention.impactScore)",
        "attention = argmax(state.highRiskPercentage)",
      ],
      evidence: "All selections are deterministic top/bottom picks across module datasets.",
    },
    {
      insight: "Observatory Analytics Center",
      modules: ["Module 19", "Module 21", "Module 23", "Module 24"],
      datasets: ["Before/after snapshots", "Alert volumes", "Effectiveness scores"],
      rules: [
        "current = baseline + (forecast − baseline) × averageCompletionPct/100",
        "delta = forecast − baseline",
      ],
      evidence: "Trends interpolate baseline and forecast using realized completion.",
    },
    {
      insight: "Cross-Module Intelligence Matrix",
      modules: ["Modules 1–24"],
      datasets: ["Module-level KPIs"],
      rules: ["matrix.cell = direct readout of module KPI"],
      evidence: "No re-weighting; cells display each module's authoritative metric.",
    },
  ];
}
