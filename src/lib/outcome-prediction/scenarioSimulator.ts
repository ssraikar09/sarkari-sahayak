import { rankMissedByBenefit } from "./predictionEngine";
import type { ScenarioId, ScenarioMeta } from "./types";

export const SCENARIOS: ScenarioMeta[] = [
  {
    id: "top3",
    label: "Apply to top 3 schemes",
    description:
      "Household acts on the 3 highest-value missed schemes for which they are already eligible.",
    actions: [
      "Identify 3 highest-value eligible-but-missed schemes per household",
      "Generate application guides and document checklists",
      "Track completion via the Navigator",
    ],
  },
  {
    id: "all",
    label: "Apply to all eligible schemes",
    description:
      "Full uptake — household applies to every scheme they are eligible for.",
    actions: [
      "Run an Eligibility Check for the household",
      "Launch application guides for each eligible scheme",
      "Reach maximum welfare coverage",
    ],
  },
  {
    id: "navigator",
    label: "Complete navigator plans",
    description:
      "Household completes every scheme recommended by the Welfare Navigator.",
    actions: [
      "Open Welfare Navigator and finish each goal plan",
      "Mark recommended schemes as explored",
      "Capture navigator-suggested benefits",
    ],
  },
  {
    id: "documentation",
    label: "Improve documentation readiness",
    description:
      "Resolving document gaps unlocks the easier half of pending applications.",
    actions: [
      "Complete Aadhaar, bank, income, and category documents",
      "Move documentation-ready schemes from missed → explored",
      "Estimated to unlock the simpler 50% of pending eligibility",
    ],
  },
];

export type SimulationInput = {
  eligible: string[]; // scheme ids
  exploredAlready: Set<string>;
  navigatorRecommended: Set<string>; // recommended_scheme_ids logged in navigator
  benefitByScheme: Map<string, number>;
};

/**
 * Deterministic — given the same inputs, always returns the same explored set.
 */
export function simulateScenario(
  scenario: ScenarioId,
  input: SimulationInput,
): Set<string> {
  const next = new Set(input.exploredAlready);
  const missed = input.eligible.filter((id) => !next.has(id));

  if (missed.length === 0) return next;

  switch (scenario) {
    case "all": {
      for (const id of missed) next.add(id);
      return next;
    }
    case "top3": {
      const ranked = rankMissedByBenefit(missed, input.benefitByScheme).slice(0, 3);
      for (const id of ranked) next.add(id);
      return next;
    }
    case "navigator": {
      for (const id of missed) {
        if (input.navigatorRecommended.has(id)) next.add(id);
      }
      return next;
    }
    case "documentation": {
      // Deterministic uplift — the documentation-friendly half of missed
      // schemes (sorted by benefit value, take ceil(half)) move to explored.
      const ranked = rankMissedByBenefit(missed, input.benefitByScheme);
      const take = Math.ceil(ranked.length / 2);
      for (let i = 0; i < take; i++) next.add(ranked[i]);
      return next;
    }
  }
}
