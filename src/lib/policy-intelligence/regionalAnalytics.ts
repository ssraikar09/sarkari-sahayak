import type { StateDemandRow, StateRiskRow } from "./types";

export function buildStateRisk(input: {
  scoresByState: Map<string, number[]>;
}): StateRiskRow[] {
  const rows: StateRiskRow[] = [];
  for (const [state, scores] of input.scoresByState) {
    if (!scores.length) continue;
    let high = 0,
      moderate = 0,
      low = 0;
    for (const s of scores) {
      if (s < 40) high += 1;
      else if (s < 75) moderate += 1;
      else low += 1;
    }
    const avg = Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
    rows.push({
      state,
      households: scores.length,
      averageOpportunityScore: avg,
      high,
      moderate,
      low,
    });
  }
  return rows.sort((a, b) => b.households - a.households);
}

export function buildStateDemand(input: {
  categoriesByState: Map<string, Map<string, number>>;
  goalsByState: Map<string, Map<string, number>>;
}): StateDemandRow[] {
  const states = new Set<string>([
    ...input.categoriesByState.keys(),
    ...input.goalsByState.keys(),
  ]);
  const rows: StateDemandRow[] = [];
  for (const state of states) {
    const cats = input.categoriesByState.get(state) ?? new Map();
    const goals = input.goalsByState.get(state) ?? new Map();
    const topCat = topKey(cats);
    const topGoal = topKey(goals);
    const total =
      sum(cats.values()) + sum(goals.values());
    rows.push({
      state,
      topCategory: topCat ?? "—",
      topGoal: topGoal ?? "—",
      totalInteractions: total,
    });
  }
  return rows.sort((a, b) => b.totalInteractions - a.totalInteractions);
}

function topKey(m: Map<string, number>): string | null {
  let best: string | null = null;
  let bestN = -1;
  for (const [k, v] of m) {
    if (v > bestN) {
      best = k;
      bestN = v;
    }
  }
  return best;
}

function sum(it: IterableIterator<number>): number {
  let s = 0;
  for (const n of it) s += n;
  return s;
}
