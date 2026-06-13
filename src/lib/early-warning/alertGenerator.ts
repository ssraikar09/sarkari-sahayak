import type { NationalSnapshot } from "@/lib/command-center/types";
import type {
  EarlyWarningAlert,
  PreventiveAction,
  WarningCategory,
  WarningConfidence,
  WarningLifecycle,
  WarningSeverity,
} from "./types";

const ACTION_LABELS: Record<PreventiveAction, string> = {
  "documentation-camp": "Organize documentation support camp",
  "awareness-drive": "Launch awareness campaign",
  "scheme-promotion": "Promote underutilized schemes",
  "csc-outreach": "Deploy CSC outreach operators",
  "navigator-engagement": "Increase Welfare Navigator engagement",
  "beneficiary-verification": "Conduct beneficiary verification drive",
  "district-review": "Initiate district-level review",
};

const CATEGORY_LABELS: Record<WarningCategory, string> = {
  "documentation-delay": "Documentation Delay Risk",
  "low-engagement": "High Eligibility, Low Engagement",
  "repeated-misses": "Repeated Missed Opportunity Pattern",
  "declining-readiness": "Declining Welfare Readiness",
  "benefit-expiration": "Households Nearing Benefit Expiration",
  "women-underutilization": "Women Welfare Utilization Gap",
  "student-inactivity": "Student Scholarship Inactivity",
  "senior-non-enrollment": "Senior Citizen Pension Non-enrollment",
  "farmer-adoption-decline": "Farmer Scheme Adoption Decline",
  "high-risk-concentration": "High-Risk Household Concentration",
  "navigator-engagement-risk": "Low Navigator Engagement Risk",
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

function lifecycleFor(score: number): WarningLifecycle {
  if (score >= 80) return "critical";
  if (score >= 60) return "escalating";
  return "emerging";
}

function confidenceFor(evidenceCount: number, householdsAnalyzed: number): WarningConfidence {
  if (householdsAnalyzed >= 25 && evidenceCount >= 3) return "high";
  if (householdsAnalyzed >= 8 && evidenceCount >= 2) return "medium";
  return "low";
}

function withLabels(actions: PreventiveAction[]) {
  return {
    recommendedActions: actions,
    recommendedActionLabels: actions.map((a) => ACTION_LABELS[a]),
  };
}

function finalize(
  base: Omit<
    EarlyWarningAlert,
    "severity" | "lifecycle" | "confidence" | "categoryLabel"
  >,
  householdsAnalyzed: number,
): EarlyWarningAlert {
  return {
    ...base,
    categoryLabel: CATEGORY_LABELS[base.category],
    severity: severityFor(base.signalScore),
    lifecycle: lifecycleFor(base.signalScore),
    confidence: confidenceFor(base.evidence.length, householdsAnalyzed),
  };
}

export function generateWarningAlerts(snap: NationalSnapshot): EarlyWarningAlert[] {
  const out: EarlyWarningAlert[] = [];
  const hh = snap.overview.householdsAnalyzed;
  const avgBenefit = Math.max(1000, snap.overview.averageEstimatedAnnualBenefitsINR);

  // 1. Documentation delay
  for (const c of snap.trends.recommendedCategories) {
    if (!DOC_HEAVY.has(c.category)) continue;
    if (c.count < 3) continue;
    const score = Math.min(100, 40 + c.count * 4);
    const households = Math.max(c.count, Math.ceil(c.count * 1.5));
    out.push(
      finalize(
        {
          id: `doc-${c.category}`,
          title: `Documentation delay risk in ${c.category}`,
          category: "documentation-delay",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.35),
          ...withLabels(["documentation-camp", "csc-outreach"]),
          triggeringConditions: [
            `${c.count} repeated misses observed in ${c.category}`,
            "Category is documentation-intensive (≥3 supporting documents typical)",
          ],
          deterministicRules: [
            "category ∈ {Health & Social Security, Women, Senior Citizens, Farmers}",
            "missed_opportunity_count ≥ 3",
            "signalScore = 40 + missed_count × 4",
          ],
          contributingModules: ["Welfare Gap Analyzer", "Policy Intelligence Engine"],
          referencedDatasets: [
            "eligibility_assessments",
            "application_guide_usage",
            "government_schemes",
          ],
          rationale:
            "Repeated misses in document-heavy categories indicate households cannot assemble required paperwork in time.",
          evidence: [
            `${c.count} missed scheme opportunities`,
            `Category: ${c.category}`,
            `Avg missed per household: ${snap.overview.averageMissedOpportunities}`,
          ],
        },
        hh,
      ),
    );
  }

  // 2. Low engagement
  for (const s of snap.underperformingSchemes.slice(0, 6)) {
    if (s.eligibleHouseholds < 2 || s.utilizationPercent > 30) continue;
    const score = Math.min(100, 50 + (30 - s.utilizationPercent) + s.opportunityGap * 2);
    out.push(
      finalize(
        {
          id: `eng-${s.id}`,
          title: `Low engagement on ${s.name}`,
          category: "low-engagement",
          region: "National",
          signalScore: score,
          householdsAffected: s.opportunityGap,
          potentialBenefitLossINR: s.opportunityGap * Math.round(avgBenefit * 0.4),
          ...withLabels(["scheme-promotion", "navigator-engagement"]),
          triggeringConditions: [
            `Utilization ${s.utilizationPercent}% across ${s.eligibleHouseholds} eligible households`,
            `${s.opportunityGap} households have not engaged`,
          ],
          deterministicRules: [
            "utilization_percent ≤ 30",
            "eligible_households ≥ 2",
            "signalScore = 50 + (30 − utilization) + opportunity_gap × 2",
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
            "Eligible households are not exploring this scheme through guides or navigator plans, indicating awareness or access friction.",
          evidence: [
            `Category: ${s.category}`,
            `Opportunity gap: ${s.opportunityGap}`,
            `Utilization: ${s.utilizationPercent}%`,
          ],
        },
        hh,
      ),
    );
  }

  // 3. Repeated missed opportunities
  if (hh >= 3 && snap.overview.averageMissedOpportunities >= 3) {
    const score = Math.min(100, 40 + snap.overview.averageMissedOpportunities * 6);
    const households = Math.round(hh * (snap.overview.highRiskPercentage / 100 + 0.2));
    out.push(
      finalize(
        {
          id: "missed-systemic",
          title: "Systemic pattern of missed welfare opportunities",
          category: "repeated-misses",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.5),
          ...withLabels(["navigator-engagement", "csc-outreach", "awareness-drive"]),
          triggeringConditions: [
            `Avg missed opportunities per household: ${snap.overview.averageMissedOpportunities}`,
            `High-risk household share: ${snap.overview.highRiskPercentage}%`,
          ],
          deterministicRules: [
            "avg_missed_per_household ≥ 3",
            "households_analyzed ≥ 3",
            "signalScore = 40 + avg_missed × 6",
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
            `${hh} households analyzed`,
            `${snap.overview.averageMissedOpportunities} avg misses per household`,
            `${snap.overview.highRiskPercentage}% high-risk`,
          ],
        },
        hh,
      ),
    );
  }

  // 4. Declining readiness — state leaderboard
  for (const row of snap.leaderboard) {
    if (row.households < 2 || row.welfareReadinessScore >= 55) continue;
    const score = Math.min(100, 100 - row.welfareReadinessScore);
    out.push(
      finalize(
        {
          id: `read-${row.state}`,
          title: `Declining welfare readiness in ${row.state}`,
          category: "declining-readiness",
          region: row.state,
          signalScore: score,
          householdsAffected: row.households,
          potentialBenefitLossINR: Math.round(row.households * avgBenefit * 0.3),
          ...withLabels(["csc-outreach", "district-review", "documentation-camp"]),
          triggeringConditions: [
            `State readiness score ${row.welfareReadinessScore}/100`,
            `${row.highRiskPercentage}% high-risk households`,
          ],
          deterministicRules: [
            "welfare_readiness_score < 55",
            "state_households ≥ 2",
            "signalScore = 100 − welfare_readiness_score",
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
            `Readiness ${row.welfareReadinessScore}/100`,
          ],
        },
        hh,
      ),
    );
  }

  // 5. Benefit expiration proxy
  if (snap.risk.high >= 2) {
    const score = Math.min(100, 45 + snap.risk.high * 5);
    const households = snap.risk.high;
    out.push(
      finalize(
        {
          id: "exp-renewal",
          title: "Households nearing benefit renewal without engagement",
          category: "benefit-expiration",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.6),
          ...withLabels(["csc-outreach", "navigator-engagement", "beneficiary-verification"]),
          triggeringConditions: [
            `${households} households in high-risk bucket`,
            "No recent guide or navigator interactions detected for these profiles",
          ],
          deterministicRules: [
            "risk_distribution.high ≥ 2",
            "signalScore = 45 + high_count × 5",
          ],
          contributingModules: ["Welfare Gap Analyzer", "Welfare Research Observatory"],
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
        },
        hh,
      ),
    );
  }

  // 6. Women
  const women = snap.goals.find((g) => g.goal === "Women's Empowerment");
  if (women && women.eligibleSchemes >= 3 && women.utilizationPercent < 40) {
    const score = Math.min(100, 50 + (40 - women.utilizationPercent));
    const households = Math.max(1, women.eligibleSchemes - women.exploredOccurrences);
    out.push(
      finalize(
        {
          id: "women-util",
          title: "Women-focused schemes are under-utilized",
          category: "women-underutilization",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.4),
          ...withLabels(["awareness-drive", "scheme-promotion", "navigator-engagement"]),
          triggeringConditions: [
            `Women's empowerment utilization at ${women.utilizationPercent}%`,
            `${women.eligibleSchemes} eligible slots, ${women.exploredOccurrences} explored`,
          ],
          deterministicRules: [
            "goal = Women's Empowerment",
            "utilization_percent < 40",
            "eligible_schemes ≥ 3",
          ],
          contributingModules: [
            "National Welfare Command Center",
            "Welfare Research Observatory",
          ],
          referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
          rationale:
            "Eligible women-focused households are not converting eligibility into maternal, safety-net and entitlement scheme exploration.",
          evidence: [
            `Navigator demand: ${women.navigatorDemand}`,
            `Utilization: ${women.utilizationPercent}%`,
          ],
        },
        hh,
      ),
    );
  }

  // 7. Students
  const edu = snap.goals.find((g) => g.goal === "Education");
  if (edu && edu.eligibleSchemes >= 3 && edu.utilizationPercent < 35) {
    const score = Math.min(100, 50 + (35 - edu.utilizationPercent));
    const households = Math.max(1, edu.eligibleSchemes - edu.exploredOccurrences);
    out.push(
      finalize(
        {
          id: "student-util",
          title: "Student scholarship inactivity detected",
          category: "student-inactivity",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.45),
          ...withLabels(["awareness-drive", "scheme-promotion"]),
          triggeringConditions: [
            `Education utilization at ${edu.utilizationPercent}%`,
            `${edu.eligibleSchemes} eligible scholarship slots, ${edu.exploredOccurrences} explored`,
          ],
          deterministicRules: [
            "goal = Education",
            "utilization_percent < 35",
            "eligible_schemes ≥ 3",
          ],
          contributingModules: [
            "National Welfare Command Center",
            "Welfare Research Observatory",
          ],
          referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
          rationale:
            "Eligible students have not engaged with pre/post-matric or merit scholarship guides ahead of academic cycles.",
          evidence: [
            `Navigator demand: ${edu.navigatorDemand}`,
            `Utilization: ${edu.utilizationPercent}%`,
          ],
        },
        hh,
      ),
    );
  }

  // 8. Seniors
  const senior = snap.goals.find((g) => g.goal === "Senior Citizen Welfare");
  if (senior && senior.eligibleSchemes >= 2 && senior.utilizationPercent < 40) {
    const score = Math.min(100, 55 + (40 - senior.utilizationPercent));
    const households = Math.max(1, senior.eligibleSchemes - senior.exploredOccurrences);
    out.push(
      finalize(
        {
          id: "senior-util",
          title: "Senior citizen pension non-enrollment risk",
          category: "senior-non-enrollment",
          region: "National",
          signalScore: score,
          householdsAffected: households,
          potentialBenefitLossINR: households * Math.round(avgBenefit * 0.55),
          ...withLabels(["csc-outreach", "documentation-camp", "beneficiary-verification"]),
          triggeringConditions: [
            `Senior welfare utilization at ${senior.utilizationPercent}%`,
            `${senior.eligibleSchemes} eligible pension slots, ${senior.exploredOccurrences} explored`,
          ],
          deterministicRules: [
            "goal = Senior Citizen Welfare",
            "utilization_percent < 40",
            "eligible_schemes ≥ 2",
          ],
          contributingModules: [
            "National Welfare Command Center",
            "Welfare Research Observatory",
          ],
          referencedDatasets: ["eligibility_assessments", "navigator_usage_logs"],
          rationale:
            "Eligible seniors have not enrolled in old-age, widow or NSAP pension schemes despite documented eligibility.",
          evidence: [
            `Navigator demand: ${senior.navigatorDemand}`,
            `Utilization: ${senior.utilizationPercent}%`,
          ],
        },
        hh,
      ),
    );
  }

  // 9. Farmer adoption decline — derive from underperforming schemes in Farmers
  const farmerSchemes = snap.underperformingSchemes.filter(
    (s) => s.category.toLowerCase().includes("farmer"),
  );
  if (farmerSchemes.length > 0) {
    const totalGap = farmerSchemes.reduce((a, s) => a + s.opportunityGap, 0);
    const avgUtil = Math.round(
      farmerSchemes.reduce((a, s) => a + s.utilizationPercent, 0) / farmerSchemes.length,
    );
    if (totalGap >= 2 && avgUtil < 45) {
      const score = Math.min(100, 50 + (45 - avgUtil) + totalGap);
      out.push(
        finalize(
          {
            id: "farmer-adoption",
            title: "Farmer scheme adoption decline",
            category: "farmer-adoption-decline",
            region: "National",
            signalScore: score,
            householdsAffected: totalGap,
            potentialBenefitLossINR: totalGap * Math.round(avgBenefit * 0.5),
            ...withLabels(["awareness-drive", "csc-outreach", "scheme-promotion"]),
            triggeringConditions: [
              `Average utilization across farmer schemes: ${avgUtil}%`,
              `${farmerSchemes.length} farmer schemes underperforming`,
            ],
            deterministicRules: [
              "category contains 'Farmer'",
              "avg_utilization_percent < 45",
              "total_opportunity_gap ≥ 2",
            ],
            contributingModules: [
              "Policy Intelligence Engine",
              "National Welfare Command Center",
            ],
            referencedDatasets: [
              "eligibility_assessments",
              "application_guide_usage",
              "government_schemes",
            ],
            rationale:
              "Multiple farmer schemes show low adoption despite eligibility, signalling outreach and trust gaps in agricultural welfare delivery.",
            evidence: [
              `${farmerSchemes.length} underperforming farmer schemes`,
              `Total opportunity gap: ${totalGap}`,
              `Avg utilization: ${avgUtil}%`,
            ],
          },
          hh,
        ),
      );
    }
  }

  // 10. Increasing high-risk concentration — states where >50% are high-risk
  for (const row of snap.regional.risk) {
    if (row.households < 2) continue;
    const highPct = Math.round((row.high / Math.max(1, row.households)) * 100);
    if (highPct < 50) continue;
    const score = Math.min(100, 50 + highPct / 2);
    out.push(
      finalize(
        {
          id: `conc-${row.state}`,
          title: `High-risk household concentration in ${row.state}`,
          category: "high-risk-concentration",
          region: row.state,
          signalScore: score,
          householdsAffected: row.high,
          potentialBenefitLossINR: row.high * Math.round(avgBenefit * 0.5),
          ...withLabels(["district-review", "csc-outreach", "documentation-camp"]),
          triggeringConditions: [
            `${highPct}% of profiled households are high-risk`,
            `${row.high} of ${row.households} households below the readiness floor`,
          ],
          deterministicRules: [
            "high_share_in_state ≥ 50%",
            "state_households ≥ 2",
            "signalScore = 50 + high_share/2",
          ],
          contributingModules: [
            "National Welfare Command Center",
            "Welfare Research Observatory",
          ],
          referencedDatasets: ["eligibility_assessments", "citizen_profiles"],
          rationale:
            "Geographic clustering of high-risk households exceeds the preventive concentration threshold of 50%.",
          evidence: [
            `${row.high} high-risk of ${row.households} profiled`,
            `Avg opportunity score in state: ${row.averageOpportunityScore}/100`,
          ],
        },
        hh,
      ),
    );
  }

  // 11. Low navigator engagement — navigator runs per household
  if (hh > 0) {
    const navRuns = snap.goals.reduce((a, g) => a + g.navigatorDemand, 0);
    const ratio = navRuns / Math.max(1, hh);
    if (ratio < 0.4) {
      const score = Math.min(100, 50 + Math.round((0.4 - ratio) * 120));
      const households = Math.round(hh * (0.4 - ratio));
      out.push(
        finalize(
          {
            id: "nav-engagement",
            title: "Low Welfare Navigator engagement risk",
            category: "navigator-engagement-risk",
            region: "National",
            signalScore: score,
            householdsAffected: Math.max(1, households),
            potentialBenefitLossINR: Math.max(1, households) * Math.round(avgBenefit * 0.35),
            ...withLabels(["navigator-engagement", "awareness-drive"]),
            triggeringConditions: [
              `Navigator adoption at ${Math.round(ratio * 100)}% (runs per household)`,
              `${navRuns} navigator runs across ${hh} households`,
            ],
            deterministicRules: [
              "navigator_runs / households_analyzed < 0.4",
              "signalScore = 50 + (0.4 − ratio) × 120",
            ],
            contributingModules: [
              "Welfare Navigator",
              "National Welfare Command Center",
              "Welfare Intervention Planner",
            ],
            referencedDatasets: ["navigator_usage_logs", "eligibility_assessments"],
            rationale:
              "Households are not converting eligibility into actionable plans through the Welfare Navigator.",
            evidence: [
              `${navRuns} navigator runs`,
              `${hh} households analyzed`,
              `Adoption ratio: ${ratio.toFixed(2)}`,
            ],
          },
          hh,
        ),
      );
    }
  }

  const rank: Record<WarningSeverity, number> = {
    critical: 0,
    high: 1,
    moderate: 2,
    low: 3,
  };
  out.sort(
    (a, b) =>
      rank[a.severity] - rank[b.severity] ||
      b.signalScore - a.signalScore ||
      a.id.localeCompare(b.id),
  );
  return out;
}
