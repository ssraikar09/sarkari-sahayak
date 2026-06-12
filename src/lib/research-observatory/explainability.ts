import type { ResearchFinding, ResearchSnapshot } from "./types";

/**
 * Canonical module → dataset/source map. Powers the "Derived from" panel and
 * keeps citations consistent across findings and exports.
 */
export const DERIVATION_SOURCES: { module: string; sources: string[] }[] = [
  {
    module: "Eligibility assessments",
    sources: ["eligibility_assessments", "citizen_profiles"],
  },
  {
    module: "Navigator analytics",
    sources: ["navigator_usage_logs", "application_guide_usage"],
  },
  {
    module: "Policy Intelligence Engine (Module 16)",
    sources: ["Regional risk rollups", "Underutilized scheme detector"],
  },
  {
    module: "Outcome Prediction Engine (Module 17)",
    sources: ["Forecast generator", "Scenario simulator"],
  },
  {
    module: "Digital Twin Simulator (Module 18)",
    sources: ["Intervention lever forecasts", "Contribution analysis"],
  },
  {
    module: "National Welfare Command Center (Module 19)",
    sources: ["State leaderboard", "Intervention recommendations"],
  },
];

/**
 * Reduce a snapshot down to the unique contributing modules and datasets so
 * the UI can render an audit trail without recomputing per-finding.
 */
export function summariseExplainability(snap: ResearchSnapshot): {
  modules: string[];
  datasets: string[];
} {
  const modules = new Set<string>();
  const datasets = new Set<string>();
  for (const f of snap.findings) {
    f.contributingModules.forEach((m) => modules.add(m));
    f.datasets.forEach((d) => datasets.add(d));
  }
  return {
    modules: Array.from(modules).sort(),
    datasets: Array.from(datasets).sort(),
  };
}

/**
 * Per-finding evidence sentence used in exports and tooltips.
 */
export function describeFindingEvidence(f: ResearchFinding): string {
  return `Derived from ${f.contributingModules.join(", ")}. Source datasets: ${f.datasets.join(", ")}. Confidence: ${f.confidence} — ${f.confidenceExplanation}`;
}
