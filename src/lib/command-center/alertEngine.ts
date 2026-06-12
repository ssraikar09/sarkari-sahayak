import type {
  StateRiskRow,
  UnderutilizedScheme,
  CategoryCount,
} from "@/lib/policy-intelligence/types";
import type { CommandAlert, CommandAlertPriority } from "./types";

function priorityFor(value: number, thresholds: [number, number, number]): CommandAlertPriority {
  if (value >= thresholds[0]) return "critical";
  if (value >= thresholds[1]) return "high";
  if (value >= thresholds[2]) return "medium";
  return "low";
}

export function buildAlerts(input: {
  stateRisk: StateRiskRow[];
  underutilized: UnderutilizedScheme[];
  topMissedCategories: CategoryCount[];
  navigatorTotal: number;
  householdsAnalyzed: number;
}): CommandAlert[] {
  const alerts: CommandAlert[] = [];

  // Welfare exclusion alerts — states with low average opportunity score
  for (const r of input.stateRisk) {
    if (r.households < 1) continue;
    const highPct = Math.round((r.high / Math.max(1, r.households)) * 100);
    if (r.averageOpportunityScore < 50 || highPct >= 40) {
      alerts.push({
        id: `excl-${r.state}`,
        title: `High welfare exclusion in ${r.state}`,
        region: r.state,
        category: "welfare-exclusion",
        priority: priorityFor(highPct, [60, 45, 30]),
        metric: `${highPct}% high-risk households · avg score ${r.averageOpportunityScore}/100`,
        rationale:
          "State-level opportunity scores are below the national readiness threshold, indicating systemic welfare gaps.",
        evidence: [
          `${r.households} households analyzed`,
          `${r.high} high-risk, ${r.moderate} moderate-risk households`,
        ],
        sources: ["eligibility_assessments", "citizen_profiles", "navigator_usage_logs"],
      });
    }
  }

  // Low scheme utilization
  for (const s of input.underutilized.slice(0, 6)) {
    if (s.eligibleCount < 2) continue;
    const util = Math.round(s.utilizationRate * 100);
    if (util > 30) continue;
    alerts.push({
      id: `util-${s.id}`,
      title: `Low utilization of ${s.name}`,
      region: "National",
      category: "low-utilization",
      priority: priorityFor(100 - util, [85, 75, 60]),
      metric: `${util}% utilization · ${s.eligibleCount} eligible households`,
      rationale:
        "Eligible households are not exploring this scheme through guides or navigator plans.",
      evidence: [
        `Category: ${s.category}`,
        `${s.exploredCount} of ${s.eligibleCount} eligible households engaged`,
      ],
      sources: ["application_guide_usage", "navigator_usage_logs", "eligibility_assessments"],
    });
  }

  // Documentation barrier signal — high missed in document-heavy categories
  const docHeavy = ["Health & Social Security", "Women", "Senior Citizens", "Farmers"];
  for (const c of input.topMissedCategories) {
    if (!docHeavy.includes(c.category)) continue;
    if (c.count < 3) continue;
    alerts.push({
      id: `doc-${c.category}`,
      title: `Documentation barrier in ${c.category}`,
      region: "National",
      category: "documentation-barrier",
      priority: priorityFor(c.count, [25, 15, 8]),
      metric: `${c.count} missed scheme opportunities`,
      rationale:
        "Schemes in this category typically require multiple documents. Persistent misses suggest documentation friction.",
      evidence: [`Repeated misses observed for ${c.category}`],
      sources: ["eligibility_assessments", "government_schemes"],
    });
  }

  // Low navigator adoption
  if (input.householdsAnalyzed > 0) {
    const ratio = input.navigatorTotal / Math.max(1, input.householdsAnalyzed);
    if (ratio < 0.4) {
      alerts.push({
        id: "nav-low",
        title: "Low Welfare Navigator adoption",
        region: "National",
        category: "navigator-adoption",
        priority: ratio < 0.15 ? "high" : "medium",
        metric: `${Math.round(ratio * 100)}% adoption (navigator runs per household)`,
        rationale:
          "Households are not converting eligibility into actionable plans through the Welfare Navigator.",
        evidence: [
          `${input.navigatorTotal} navigator runs across ${input.householdsAnalyzed} households`,
        ],
        sources: ["navigator_usage_logs", "citizen_profiles"],
      });
    }
  }

  // Deterministic ordering: priority → metric label
  const order: Record<CommandAlertPriority, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  alerts.sort((a, b) => order[a.priority] - order[b.priority] || a.id.localeCompare(b.id));
  return alerts.slice(0, 12);
}
