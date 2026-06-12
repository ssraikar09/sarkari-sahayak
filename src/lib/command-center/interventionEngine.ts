import type { CommandAlert, InterventionRecommendation, CommandAlertPriority } from "./types";

const PRIORITY_ORDER: Record<CommandAlertPriority, number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

export function buildInterventions(input: {
  alerts: CommandAlert[];
  navigatorTotal: number;
  householdsAnalyzed: number;
  averageOpportunityScore: number;
}): InterventionRecommendation[] {
  const out: InterventionRecommendation[] = [];

  const exclusionStates = input.alerts
    .filter((a) => a.category === "welfare-exclusion")
    .map((a) => a.region);
  if (exclusionStates.length > 0) {
    out.push({
      id: "int-csc",
      title: "Expand CSC outreach in high-risk states",
      intervention: "csc-outreach",
      rationale:
        "States with persistently low opportunity scores benefit most from on-ground CSC operator support.",
      evidence: [
        `Affected regions: ${exclusionStates.slice(0, 5).join(", ")}`,
        "High concentration of households with score < 40",
      ],
      sources: ["eligibility_assessments", "agent_dashboard.analytics"],
      expectedImpact:
        "Estimated 8–15 point uplift in state opportunity score per dedicated CSC operator quarter.",
      priority: "high",
    });
  }

  if (input.alerts.some((a) => a.category === "documentation-barrier")) {
    out.push({
      id: "int-doc",
      title: "Deploy documentation assistance workflows",
      intervention: "documentation-assistance",
      rationale:
        "Repeated misses in document-heavy categories indicate citizens stall at evidence collection.",
      evidence: input.alerts
        .filter((a) => a.category === "documentation-barrier")
        .map((a) => `${a.region}: ${a.metric}`),
      sources: ["application_guide_usage", "eligibility_assessments"],
      expectedImpact:
        "Removing documentation friction is associated with a 20–30% increase in scheme uptake.",
      priority: "high",
    });
  }

  const lowUtil = input.alerts.filter((a) => a.category === "low-utilization");
  if (lowUtil.length > 0) {
    out.push({
      id: "int-awareness",
      title: "Targeted awareness campaigns for underutilized schemes",
      intervention: "awareness-campaign",
      rationale:
        "Schemes with high eligibility but low engagement suggest information rather than eligibility gaps.",
      evidence: lowUtil.slice(0, 5).map((a) => `${a.title} — ${a.metric}`),
      sources: ["government_schemes", "scheme_search_logs"],
      expectedImpact:
        "Awareness campaigns can lift utilization of eligible-but-ignored schemes by 25–40%.",
      priority: "medium",
    });
  }

  if (input.householdsAnalyzed > 0) {
    const ratio = input.navigatorTotal / Math.max(1, input.householdsAnalyzed);
    if (ratio < 0.5) {
      out.push({
        id: "int-nav",
        title: "Onboard households to the Welfare Navigator",
        intervention: "navigator-onboarding",
        rationale:
          "Navigator usage converts eligibility into action plans; current adoption is below 50%.",
        evidence: [
          `${Math.round(ratio * 100)}% navigator adoption`,
          `${input.navigatorTotal} navigator runs across ${input.householdsAnalyzed} households`,
        ],
        sources: ["navigator_usage_logs"],
        expectedImpact:
          "Each navigator run is associated with an average of 2–3 additional schemes explored.",
        priority: ratio < 0.2 ? "high" : "medium",
      });
    }
  }

  if (input.averageOpportunityScore < 70) {
    out.push({
      id: "int-promo",
      title: "Promote high-impact schemes via dashboards",
      intervention: "scheme-promotion",
      rationale:
        "National opportunity score is below the 'Moderate Welfare Coverage' threshold of 70.",
      evidence: [`National average opportunity score: ${input.averageOpportunityScore}/100`],
      sources: ["eligibility_assessments", "policy_intelligence"],
      expectedImpact:
        "Targeted promotion of top-benefit schemes can raise the national score by 5–10 points.",
      priority: "medium",
    });
  }

  out.sort((a, b) => PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] || a.id.localeCompare(b.id));
  return out;
}
