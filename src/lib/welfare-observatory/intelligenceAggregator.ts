import type { NationalSnapshot } from "@/lib/command-center/types";
import type { InterventionPlannerSnapshot } from "@/lib/intervention-planner/types";
import type { EarlyWarningSnapshot } from "@/lib/early-warning/types";
import type { ImpactMonitoringSnapshot } from "@/lib/impact-monitoring/types";
import type {
  AnalyticsTrend,
  CrossModuleContribution,
  IntelligenceInsight,
  ObservatorySummary,
} from "./types";

export function buildSummary(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): ObservatorySummary {
  const ov = national.overview;
  const highRisk = Math.round((ov.highRiskPercentage / 100) * ov.householdsAnalyzed);
  return {
    householdsAnalyzed: ov.householdsAnalyzed,
    schemesMonitored: ov.totalEligibleSchemes,
    opportunityScore: Math.round(ov.averageOpportunityScore),
    welfareReadinessScore: Math.round(ov.welfareReadinessScore),
    annualBenefitsUnlockedINR: ov.totalEstimatedBenefitsUnlockedINR,
    highRiskHouseholds: highRisk,
    activeInterventions: planner.interventions.length,
    activeAlerts: warnings.summary.activeAlerts,
    impactInitiativesMonitored: impact.summary.interventionsMonitored,
  };
}

export function buildIntelligenceInsights(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): IntelligenceInsight[] {
  const insights: IntelligenceInsight[] = [];

  // Underserved population — lowest opportunity state
  const sortedByOpp = [...national.leaderboard].sort(
    (a, b) => a.opportunityScore - b.opportunityScore,
  );
  const underserved = sortedByOpp[0];
  if (underserved) {
    insights.push({
      id: "underserved-population",
      kind: "underserved-population",
      title: `Most underserved population: ${underserved.state}`,
      detail: `Opportunity score ${underserved.opportunityScore} with ${underserved.highRiskPercentage}% high-risk households.`,
      contributingModules: ["Module 16 Policy Intelligence", "Module 19 Digital Twin"],
      datasets: ["National leaderboard", "State risk distribution"],
      rules: ["state.opportunityScore = min across leaderboard"],
      evidence: `${underserved.households.toLocaleString()} households evaluated in ${underserved.state}.`,
    });
  }

  // Highest-impact intervention
  const topIntervention = [...planner.interventions].sort(
    (a, b) => b.impactScore - a.impactScore,
  )[0];
  if (topIntervention) {
    insights.push({
      id: "high-impact-intervention",
      kind: "high-impact-intervention",
      title: `Highest-impact intervention: ${topIntervention.title}`,
      detail: `Impact score ${topIntervention.impactScore}/100 reaching ${topIntervention.populationAffected.toLocaleString()} households.`,
      contributingModules: ["Module 21 Intervention Planner", "Module 24 Impact Monitoring"],
      datasets: ["Planner aggregate forecast", "Intervention impact register"],
      rules: ["intervention.impactScore = max across ranked interventions"],
      evidence: topIntervention.rationale,
    });
  }

  // Region requiring attention — highest risk state
  const sortedByRisk = [...national.leaderboard].sort(
    (a, b) => b.highRiskPercentage - a.highRiskPercentage,
  );
  const attention = sortedByRisk[0];
  if (attention) {
    insights.push({
      id: "region-attention",
      kind: "region-attention",
      title: `Region requiring attention: ${attention.state}`,
      detail: `High-risk share ${attention.highRiskPercentage}% across ${attention.households.toLocaleString()} households.`,
      contributingModules: ["Module 17 Policy Intelligence", "Module 23 Early Warning"],
      datasets: ["State risk leaderboard", "Early warning concentration"],
      rules: ["state.highRiskPercentage = max across leaderboard"],
      evidence: `Welfare readiness ${attention.welfareReadinessScore}/100 in ${attention.state}.`,
    });
  }

  // Most underutilized scheme
  const underutilized = [...national.underperformingSchemes].sort(
    (a, b) => b.opportunityGap - a.opportunityGap,
  )[0];
  if (underutilized) {
    insights.push({
      id: "underutilized-scheme",
      kind: "underutilized-scheme",
      title: `Most underutilized scheme: ${underutilized.name}`,
      detail: `Only ${underutilized.utilizationPercent}% utilization across ${underutilized.eligibleHouseholds.toLocaleString()} eligible households.`,
      contributingModules: ["Module 16 Policy Intelligence", "Module 20 Research Observatory"],
      datasets: ["Underperforming scheme registry"],
      rules: ["scheme.opportunityGap = max across underperforming"],
      evidence: `Category: ${underutilized.category}.`,
    });
  }

  // Largest unrealized benefit category
  const topCat = [...national.trends.recommendedCategories].sort(
    (a, b) => b.count - a.count,
  )[0];
  if (topCat) {
    const unrealized = Math.round(
      (1 - planner.aggregateForecast.opportunityScoreLift / 100) *
        national.overview.totalEstimatedBenefitsUnlockedINR *
        0.4,
    );
    insights.push({
      id: "unrealized-benefit",
      kind: "unrealized-benefit",
      title: `Largest unrealized benefit category: ${topCat.category}`,
      detail: `Demand signal ${topCat.count} households; estimated unrealized benefits scale with category share.`,
      contributingModules: ["Module 20 Research Observatory", "Module 21 Intervention Planner"],
      datasets: ["Recommended category trends", "Aggregate forecast"],
      rules: ["category = argmax(recommendedCategories.count)"],
      evidence: `Approx. ₹${unrealized.toLocaleString("en-IN")} potential annual unlock if forecast realized.`,
    });
  }

  // Emerging welfare priority — highest severity alert category
  const topAlertBucket = warnings.trends.categoryDistribution[0];
  if (topAlertBucket && warnings.summary.activeAlerts > 0) {
    insights.push({
      id: "emerging-priority",
      kind: "emerging-priority",
      title: `Emerging welfare priority: ${topAlertBucket.label}`,
      detail: `${topAlertBucket.count} active alerts impacting ${topAlertBucket.households.toLocaleString()} households.`,
      contributingModules: ["Module 23 Early Warning", "Module 24 Impact Monitoring"],
      datasets: ["Early warning category distribution"],
      rules: ["priority = top(categoryDistribution by households)"],
      evidence: `Benefits at risk: ₹${warnings.summary.benefitsAtRiskINR.toLocaleString("en-IN")}.`,
    });
  }

  return insights;
}

export function buildAnalyticsTrends(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): AnalyticsTrend[] {
  const ov = national.overview;
  const baseOpp = Math.round(ov.averageOpportunityScore);
  const afterOpp = impact.beforeAfter.after.opportunityScore;
  const baseRead = Math.round(ov.welfareReadinessScore);
  const afterRead = impact.beforeAfter.after.welfareReadinessScore;
  const baseBenefit = impact.beforeAfter.before.annualBenefitsINR;
  const afterBenefit = impact.beforeAfter.after.annualBenefitsINR;
  const completion = impact.summary.averageCompletionPct;

  const lerp = (a: number, b: number, t: number) => Math.round(a + (b - a) * t);

  return [
    {
      key: "opportunity-score",
      label: "Opportunity score",
      series: [
        { label: "Baseline", value: baseOpp, unit: "" },
        { label: "Current", value: lerp(baseOpp, afterOpp, completion / 100), unit: "" },
        { label: "Forecast", value: afterOpp, unit: "" },
      ],
      delta: afterOpp - baseOpp,
      deltaUnit: "pts",
      source: "National overview + intervention forecast",
    },
    {
      key: "welfare-readiness",
      label: "Welfare readiness",
      series: [
        { label: "Baseline", value: baseRead, unit: "" },
        { label: "Current", value: lerp(baseRead, afterRead, completion / 100), unit: "" },
        { label: "Forecast", value: afterRead, unit: "" },
      ],
      delta: afterRead - baseRead,
      deltaUnit: "pts",
      source: "Readiness scoring across households",
    },
    {
      key: "benefit-unlocks",
      label: "Benefit unlocks",
      series: [
        { label: "Baseline", value: Math.round(baseBenefit / 100000), unit: "L" },
        {
          label: "Current",
          value: Math.round(lerp(baseBenefit, afterBenefit, completion / 100) / 100000),
          unit: "L",
        },
        { label: "Forecast", value: Math.round(afterBenefit / 100000), unit: "L" },
      ],
      delta: Math.round((afterBenefit - baseBenefit) / 100000),
      deltaUnit: "L ₹",
      source: "Annual benefit estimator",
    },
    {
      key: "alert-volume",
      label: "Alert volume",
      series: [
        { label: "Critical", value: warnings.summary.criticalAlerts, unit: "" },
        { label: "High", value: warnings.summary.highPriorityAlerts, unit: "" },
        { label: "Active", value: warnings.summary.activeAlerts, unit: "" },
      ],
      delta: warnings.summary.activeAlerts,
      deltaUnit: "alerts",
      source: "Early warning engine",
    },
    {
      key: "intervention-effectiveness",
      label: "Intervention effectiveness",
      series: impact.interventions.slice(0, 4).map((i) => ({
        label: i.title.length > 18 ? i.title.slice(0, 18) + "…" : i.title,
        value: i.effectivenessScore,
        unit: "/100",
      })),
      delta: Math.round(
        impact.interventions.reduce((s, i) => s + i.effectivenessScore, 0) /
          Math.max(1, impact.interventions.length),
      ),
      deltaUnit: "avg",
      source: "Impact monitoring effectiveness scores",
    },
    {
      key: "impact-achievements",
      label: "Impact achievements",
      series: [
        { label: "Households", value: impact.summary.householdsPositivelyImpacted, unit: "" },
        { label: "Opp uplift", value: impact.summary.opportunityScoreUplift, unit: "pts" },
        { label: "Risk -", value: impact.summary.highRiskReductionPct, unit: "%" },
      ],
      delta: impact.summary.opportunityScoreUplift,
      deltaUnit: "pts",
      source: "Impact monitoring summary",
    },
  ];
}

export function buildCrossModuleMatrix(
  national: NationalSnapshot,
  planner: InterventionPlannerSnapshot,
  warnings: EarlyWarningSnapshot,
  impact: ImpactMonitoringSnapshot,
): CrossModuleContribution[] {
  return [
    {
      band: "Citizen Welfare (Modules 1–15)",
      modules: [
        {
          name: "Schemes & Eligibility",
          contribution: `${national.overview.totalEligibleSchemes.toLocaleString()} schemes catalogued`,
          outcome: `${national.overview.householdsAnalyzed.toLocaleString()} households assessed`,
        },
        {
          name: "Family Planner & Navigator",
          contribution: `${national.goals.length} welfare goals tracked`,
          outcome: `${national.trends.recommendedCategories.length} recommended categories`,
        },
        {
          name: "AI Assistant & Knowledge Graph",
          contribution: "Conversational discovery layer",
          outcome: `${national.trends.topExploredGuides.length} guides surfaced`,
        },
      ],
    },
    {
      band: "Policy & Research (Modules 16–20)",
      modules: [
        {
          name: "Policy Intelligence",
          contribution: `${national.upstreamRecommendations.length} policy signals`,
          outcome: `${national.alerts.length} command alerts`,
        },
        {
          name: "Outcome Prediction & Digital Twin",
          contribution: `Opportunity baseline ${Math.round(national.overview.averageOpportunityScore)}`,
          outcome: `Readiness ${Math.round(national.overview.welfareReadinessScore)}/100`,
        },
        {
          name: "Research Observatory",
          contribution: `${national.underperformingSchemes.length} underperforming schemes`,
          outcome: `${national.underutilizedSchemes.length} underutilized schemes`,
        },
      ],
    },
    {
      band: "Execution (Modules 21–24)",
      modules: [
        {
          name: "Intervention Planner",
          contribution: `${planner.interventions.length} interventions ranked`,
          outcome: `+${planner.aggregateForecast.opportunityScoreLift} forecast opportunity lift`,
        },
        {
          name: "Offline Assistance & Early Warning",
          contribution: `${warnings.summary.activeAlerts} alerts active`,
          outcome: `₹${warnings.summary.benefitsAtRiskINR.toLocaleString("en-IN")} benefits at risk`,
        },
        {
          name: "Impact Monitoring",
          contribution: `${impact.summary.interventionsMonitored} initiatives monitored`,
          outcome: `+${impact.summary.opportunityScoreUplift} realized uplift`,
        },
      ],
    },
  ];
}
