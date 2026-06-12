import type { PolicyRecommendation } from "@/lib/policy-intelligence/types";
import type { InterventionRecommendation } from "./types";

/**
 * Merge upstream policy recommendations and command-center intervention
 * recommendations into a single deterministic, deduplicated list.
 */
export function mergeRecommendations(
  policy: PolicyRecommendation[],
  interventions: InterventionRecommendation[],
): Array<{
  id: string;
  title: string;
  source: "policy" | "intervention";
  rationale: string;
  evidence: string[];
  sources: string[];
  priority: "critical" | "high" | "medium" | "low";
  expectedImpact?: string;
}> {
  const merged = [
    ...policy.map((p) => ({
      id: `p-${p.id}`,
      title: p.title,
      source: "policy" as const,
      rationale: p.rationale,
      evidence: p.evidence,
      sources: p.sources,
      priority: (p.priority === "high"
        ? "high"
        : p.priority === "medium"
          ? "medium"
          : "low") as "high" | "medium" | "low",
    })),
    ...interventions.map((i) => ({
      id: `i-${i.id}`,
      title: i.title,
      source: "intervention" as const,
      rationale: i.rationale,
      evidence: i.evidence,
      sources: i.sources,
      priority: i.priority,
      expectedImpact: i.expectedImpact,
    })),
  ];
  const order = { critical: 0, high: 1, medium: 2, low: 3 } as const;
  merged.sort((a, b) => order[a.priority] - order[b.priority] || a.id.localeCompare(b.id));
  return merged;
}
