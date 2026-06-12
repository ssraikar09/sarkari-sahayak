import { LEVERS } from "./presets";
import type {
  AuditTrail,
  DigitalTwinBaseline,
  DigitalTwinForecast,
  Explainer,
  Levers,
} from "./types";

export function buildExplainers(
  baseline: DigitalTwinBaseline,
  forecast: DigitalTwinForecast,
): Explainer[] {
  const out: Explainer[] = [];
  const top = [...forecast.contributions].sort(
    (a, b) => b.contributionPct - a.contributionPct,
  );
  const driver = top[0];

  if (forecast.deltas.opportunityScore > 0) {
    const reasons: string[] = [];
    for (const c of top.slice(0, 3)) {
      if (c.contributionPct <= 0) continue;
      const meta = LEVERS.find((l) => l.id === c.id)!;
      reasons.push(
        `${meta.short} lever set to ${forecast.levers[c.id]}% contributes ~${c.contributionPct}% of the lift`,
      );
    }
    out.push({
      id: "score",
      headline: `Opportunity score rises by ${forecast.deltas.opportunityScore} points`,
      rationale:
        "More eligible schemes get actioned per household when intervention levers raise the uptake probability of currently-missed entitlements.",
      evidence: reasons.length ? reasons : ["All levers at 0% — no change applied."],
      sources: [
        "Eligibility assessments",
        "Application guide usage",
        "Navigator usage logs",
      ],
    });
  }

  if (forecast.deltas.benefitGainINR > 0) {
    out.push({
      id: "benefits",
      headline: `Average annual benefits grow by ₹${forecast.deltas.benefitGainINR.toLocaleString("en-IN")}`,
      rationale:
        "The forecast walks each household's missed schemes in descending benefit order — higher-value entitlements are unlocked first as uptake improves.",
      evidence: [
        `Driven primarily by ${driver?.label ?? "the active levers"}`,
        "Benefit values come from the published-value table and category defaults (Module 1).",
      ],
      sources: ["Welfare Gap benefit estimator", "Government schemes registry"],
    });
  }

  if (forecast.deltas.riskReductionPct > 0) {
    out.push({
      id: "risk",
      headline: `High welfare-risk share drops by ${forecast.deltas.riskReductionPct} pp`,
      rationale:
        "Households whose simulated opportunity score crosses the 40-point threshold move out of the high-risk tier.",
      evidence: [
        `${forecast.currentRisk.high} high-risk households → ${forecast.simulatedRisk.high} after intervention`,
        "Risk thresholds match Module 1 (Welfare Gap Engine).",
      ],
      sources: ["Welfare Gap risk distribution", "Citizen profiles"],
    });
  }

  if (forecast.deltas.readinessLift > 0) {
    out.push({
      id: "readiness",
      headline: `Welfare readiness score climbs by ${forecast.deltas.readinessLift} points`,
      rationale:
        "Readiness blends average opportunity score with the inverse of the high-risk share, so improvements compound.",
      evidence: [
        `Formula: round(0.6 × avg score + 0.4 × (100 − high-risk %))`,
      ],
      sources: ["Research Insights snapshot", "Policy Intelligence aggregates"],
    });
  }

  if (out.length === 0) {
    out.push({
      id: "noop",
      headline: "No measurable change",
      rationale:
        "All levers are at 0% or the existing household base is already saturated. Move a slider to see projected impact.",
      evidence: [`Baseline households: ${baseline.totals.households}`],
      sources: ["Eligibility assessments"],
    });
  }

  return out;
}

export function buildAuditTrail(levers: Levers): AuditTrail {
  return {
    inputs: levers,
    formulas: [
      {
        name: "Uplift",
        formula:
          "uplift = Σ weight_i × (lever_i / 100) + 0.10 × navRatio × (navigatorLever / 100)",
      },
      {
        name: "New uptake ratio",
        formula: "newRatio = min(1, baseRatio + (1 − baseRatio) × uplift)",
      },
      { name: "Opportunity score", formula: "score = round(newRatio × 100)" },
      {
        name: "Readiness score",
        formula: "round(0.6 × avgScore + 0.4 × (100 − highRiskPct))",
      },
    ],
    sources: [
      "eligibility_assessments",
      "application_guide_usage",
      "navigator_usage_logs",
      "government_schemes",
      "citizen_profiles",
    ],
    timestamp: new Date().toISOString(),
  };
}
