import type { NationalSnapshot } from "@/lib/command-center/types";
import type {
  EarlyWarningAlert,
  PreventiveAction,
  WarningCategory,
  WarningSeverity,
} from "./types";

const ACTION_LABELS: Record<PreventiveAction, string> = {
  "documentation-camp": "Conduct documentation camp",
  "awareness-drive": "Schedule awareness drive",
  "scheme-promotion": "Promote relevant schemes",
  "csc-outreach": "Deploy CSC outreach operators",
  "navigator-engagement": "Initiate Welfare Navigator engagement",
};

const CATEGORY_LABELS: Record<WarningCategory, string> = {
  "documentation-delay": "Documentation Delay Risk",
  "low-engagement": "High Eligibility, Low Engagement",
  "repeated-misses": "Repeated Missed Opportunities",
  "declining-readiness": "Declining Welfare Readiness",
  "benefit-expiration": "Households Nearing Benefit Expiration",
  "women-underutilization": "Women-Focused Scheme Underutilization",
  "student-inactivity": "Student Scholarship Inactivity",
  "senior-non-enrollment": "Senior Citizen Pension Non-Enrollment",
};

const DOC_HEAVY = new Set([
  "Health & Social Security",
  "Women",
  "Senior Citizens",
  "Farmers",
]);

function severityFor(score: number): WarningSeverity {
  if (score >= 80) return "critical";
  if (score >= 60) return "high";
  if (score >= 40) return "moderate";
  return "low";
}

function withLabels(actions: PreventiveAction[]) {
  return {
    recommendedActions: actions,
    recommendedActionLabels: actions.map((a) => ACTION_LABELS[a]),
  };
}

export function generateWarningAlerts(snap: NationalSnapshot): EarlyWarningAlert[] {
  const alerts: EarlyWarningAlert[] = [];
  const avgBenefitPerHousehold = Math.max(
    1000,
    snap.overview.averageEstimatedAnnualBenefitsINR,
  );

  // 1. Documentation delay — top missed categories in doc-heavy verticals
  for (const c of snap.trends.recommendedCategories) {
    if (!DOC_HEAVY.has(c.category)) continue;
    if (c.count < 3) continue;
    const score = Math.min(100, 40 + c.count * 4);
    const households = Math.max(c.count, Math.ceil(c.count * 1.5));
    alerts.push({
      id: `doc-${c.category}`,
      title: `Documentation delay risk in ${c.category}`,
      category: "documentation-delay",
      categoryLabel: CATEGORY_LABELS["documentation-delay"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.35),
      ...withLabels(["documentation-camp", "csc-outreach"]),
      triggeringConditions: [
        `${c.count} repeated misses observed in ${c.category}`,
        "Category is documentation-intensive (≥3 supporting documents typical)",
      ],
      contributingModules: ["Policy Intelligence Engine", "Welfare Gap Analyzer"],
      referencedDatasets: [
        "eligibility_assessments",
        "application_guide_usage",
        "government_schemes",
      ],
      rationale:
        "Repeated misses in document-heavy categories indicate that households are unable to assemble required paperwork in time.",
      evidence: [
        `${c.count} missed scheme opportunities`,
        `Category: ${c.category}`,
      ],
    });
  }

  // 2. High eligibility but low engagement — underperforming schemes
  for (const s of snap.underperformingSchemes.slice(0, 6)) {
    if (s.eligibleHouseholds < 2) continue;
    if (s.utilizationPercent > 30) continue;
    const score = Math.min(100, 50 + (30 - s.utilizationPercent) + s.opportunityGap * 2);
    alerts.push({
      id: `eng-${s.id}`,
      title: `Low engagement on ${s.name}`,
      category: "low-engagement",
      categoryLabel: CATEGORY_LABELS["low-engagement"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: s.opportunityGap,
      potentialBenefitLossINR: s.opportunityGap * Math.round(avgBenefitPerHousehold * 0.4),
      ...withLabels(["scheme-promotion", "navigator-engagement"]),
      triggeringConditions: [
        `${s.utilizationPercent}% utilization across ${s.eligibleHouseholds} eligible households`,
        `${s.opportunityGap} eligible households have not engaged`,
      ],
      contributingModules: [
        "Policy Intelligence Engine",
        "National Welfare Command Center",
      ],
      referencedDatasets: [
        "application_guide_usage",
        "navigator_usage_logs",
        "eligibility_assessments",
      ],
      rationale:
        "Eligible households are not exploring this scheme through guides or navigator plans, signalling an awareness or access gap.",
      evidence: [
        `Category: ${s.category}`,
        `Opportunity gap: ${s.opportunityGap} households`,
      ],
    });
  }

  // 3. Repeated missed opportunities — high household missed average
  if (snap.overview.householdsAnalyzed >= 3 && snap.overview.averageMissedOpportunities >= 3) {
    const score = Math.min(100, 40 + snap.overview.averageMissedOpportunities * 6);
    const households = Math.round(
      snap.overview.householdsAnalyzed * (snap.overview.highRiskPercentage / 100 + 0.2),
    );
    alerts.push({
      id: "missed-systemic",
      title: "Systemic pattern of missed welfare opportunities",
      category: "repeated-misses",
      categoryLabel: CATEGORY_LABELS["repeated-misses"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.5),
      ...withLabels(["navigator-engagement", "csc-outreach", "awareness-drive"]),
      triggeringConditions: [
        `Average missed opportunities per household: ${snap.overview.averageMissedOpportunities}`,
        `High-risk household share: ${snap.overview.highRiskPercentage}%`,
      ],
      contributingModules: [
        "Welfare Gap Analyzer",
        "Outcome Prediction Engine",
        "Welfare Digital Twin Simulator",
      ],
      referencedDatasets: [
        "eligibility_assessments",
        "application_guide_usage",
        "navigator_usage_logs",
      ],
      rationale:
        "A persistent gap between eligible and explored schemes indicates households are not converting eligibility into action.",
      evidence: [
        `${snap.overview.householdsAnalyzed} households analyzed`,
        `${snap.overview.averageMissedOpportunities} avg misses per household`,
      ],
    });
  }

  // 4. Declining welfare readiness — state-level risk leaderboard
  for (const row of snap.leaderboard) {
    if (row.households < 2) continue;
    if (row.welfareReadinessScore >= 55) continue;
    const score = Math.min(100, 100 - row.welfareReadinessScore);
    alerts.push({
      id: `read-${row.state}`,
      title: `Declining welfare readiness in ${row.state}`,
      category: "declining-readiness",
      categoryLabel: CATEGORY_LABELS["declining-readiness"],
      region: row.state,
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: row.households,
      potentialBenefitLossINR: Math.round(
        row.households * avgBenefitPerHousehold * 0.3,
      ),
      ...withLabels(["csc-outreach", "documentation-camp", "awareness-drive"]),
      triggeringConditions: [
        `State readiness score ${row.welfareReadinessScore}/100`,
        `${row.highRiskPercentage}% high-risk households`,
      ],
      contributingModules: [
        "National Welfare Command Center",
        "Policy Intelligence Engine",
      ],
      referencedDatasets: [
        "eligibility_assessments",
        "citizen_profiles",
        "navigator_usage_logs",
      ],
      rationale:
        "State welfare readiness has dropped below the national preventive threshold of 55/100.",
      evidence: [
        `${row.households} households profiled`,
        `Opportunity score ${row.opportunityScore}/100`,
      ],
    });
  }

  // 5. Households nearing benefit expiration — proxy: high-risk share with no engagement
  if (snap.risk.high >= 2) {
    const score = Math.min(100, 45 + snap.risk.high * 5);
    const households = snap.risk.high;
    alerts.push({
      id: "exp-renewal",
      title: "Households nearing benefit renewal without engagement",
      category: "benefit-expiration",
      categoryLabel: CATEGORY_LABELS["benefit-expiration"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.6),
      ...withLabels(["csc-outreach", "navigator-engagement"]),
      triggeringConditions: [
        `${households} households in high-risk bucket`,
        "No recent guide or navigator interactions detected for these profiles",
      ],
      contributingModules: [
        "Welfare Gap Analyzer",
        "Welfare Research Observatory",
      ],
      referencedDatasets: [
        "eligibility_assessments",
        "application_guide_usage",
        "navigator_usage_logs",
      ],
      rationale:
        "Benefits linked to annual renewal lapse silently when households do not re-engage with CSC or navigator workflows.",
      evidence: [
        `${households} high-risk households`,
        `${snap.risk.total} total households assessed`,
      ],
    });
  }

  // 6. Women-focused scheme underutilization
  const womenGoal = snap.goals.find((g) => g.goal === "Women's Empowerment");
  if (womenGoal && womenGoal.eligibleSchemes >= 3 && womenGoal.utilizationPercent < 40) {
    const score = Math.min(100, 50 + (40 - womenGoal.utilizationPercent));
    const households = Math.max(
      1,
      womenGoal.eligibleSchemes - womenGoal.exploredOccurrences,
    );
    alerts.push({
      id: "women-util",
      title: "Women-focused schemes are under-utilized",
      category: "women-underutilization",
      categoryLabel: CATEGORY_LABELS["women-underutilization"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.4),
      ...withLabels(["awareness-drive", "scheme-promotion", "navigator-engagement"]),
      triggeringConditions: [
        `Women's empowerment utilization at ${womenGoal.utilizationPercent}%`,
        `${womenGoal.eligibleSchemes} eligible scheme slots, ${womenGoal.exploredOccurrences} explored`,
      ],
      contributingModules: [
        "National Welfare Command Center",
        "Welfare Research Observatory",
      ],
      referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
      rationale:
        "Eligible women-focused households are not converting eligibility into exploration of maternal, safety-net and entitlement schemes.",
      evidence: [
        `Goal: Women's Empowerment`,
        `Navigator demand: ${womenGoal.navigatorDemand}`,
      ],
    });
  }

  // 7. Student scholarship inactivity
  const eduGoal = snap.goals.find((g) => g.goal === "Education");
  if (eduGoal && eduGoal.eligibleSchemes >= 3 && eduGoal.utilizationPercent < 35) {
    const score = Math.min(100, 50 + (35 - eduGoal.utilizationPercent));
    const households = Math.max(
      1,
      eduGoal.eligibleSchemes - eduGoal.exploredOccurrences,
    );
    alerts.push({
      id: "student-util",
      title: "Student scholarship inactivity detected",
      category: "student-inactivity",
      categoryLabel: CATEGORY_LABELS["student-inactivity"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.45),
      ...withLabels(["awareness-drive", "scheme-promotion"]),
      triggeringConditions: [
        `Education utilization at ${eduGoal.utilizationPercent}%`,
        `${eduGoal.eligibleSchemes} eligible scholarship slots, ${eduGoal.exploredOccurrences} explored`,
      ],
      contributingModules: [
        "National Welfare Command Center",
        "Welfare Research Observatory",
      ],
      referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
      rationale:
        "Eligible students have not engaged with pre/post-matric or merit scholarship guides ahead of academic cycles.",
      evidence: [
        `Goal: Education`,
        `Navigator demand: ${eduGoal.navigatorDemand}`,
      ],
    });
  }

  // 8. Senior citizen pension non-enrollment
  const seniorGoal = snap.goals.find((g) => g.goal === "Senior Citizen Welfare");
  if (seniorGoal && seniorGoal.eligibleSchemes >= 2 && seniorGoal.utilizationPercent < 40) {
    const score = Math.min(100, 55 + (40 - seniorGoal.utilizationPercent));
    const households = Math.max(
      1,
      seniorGoal.eligibleSchemes - seniorGoal.exploredOccurrences,
    );
    alerts.push({
      id: "senior-util",
      title: "Senior citizen pension non-enrollment risk",
      category: "senior-non-enrollment",
      categoryLabel: CATEGORY_LABELS["senior-non-enrollment"],
      region: "National",
      severity: severityFor(score),
      signalScore: score,
      householdsAffected: households,
      potentialBenefitLossINR: households * Math.round(avgBenefitPerHousehold * 0.55),
      ...withLabels(["csc-outreach", "documentation-camp", "awareness-drive"]),
      triggeringConditions: [
        `Senior welfare utilization at ${seniorGoal.utilizationPercent}%`,
        `${seniorGoal.eligibleSchemes} eligible pension slots, ${seniorGoal.exploredOccurrences} explored`,
      ],
      contributingModules: [
        "National Welfare Command Center",
        "Welfare Research Observatory",
      ],
      referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
      rationale:
        "Eligible seniors have not enrolled in old-age, widow or NSAP pension schemes despite documented eligibility.",
      evidence: [
        `Goal: Senior Citizen Welfare`,
        `Navigator demand: ${seniorGoal.navigatorDemand}`,
      ],
    });
  }

  // Deterministic ordering: severity rank, then signalScore desc, then id
  const rank: Record<WarningSeverity, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    low: 3,
  };
  alerts.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      b.signalScore - a.signalScore ||
      a.id.localeCompare(b.id),
  );
  return alerts;
}
