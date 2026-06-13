import type { EarlyWarningAlert, WarningTrends } from "./types";

export function buildWarningTrends(alerts: EarlyWarningAlert[]): WarningTrends {
  const cat = new Map<string, { count: number; households: number }>();
  const reg = new Map<string, { count: number; households: number }>();
  const sev = new Map<string, { count: number; households: number }>();

  for (const a of alerts) {
    bump(cat, a.categoryLabel, a.householdsAffected);
    bump(reg, a.region, a.householdsAffected);
    bump(sev, capitalize(a.severity), a.householdsAffected);
  }

  return {
    categoryDistribution: toRows(cat).sort(
      (a, b) => b.count - a.count || a.label.localeCompare(b.label),
    ),
    regionConcentration: toRows(reg)
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 8),
    severityComposition: toRows(sev).sort(
      (a, b) => severityOrder(a.label) - severityOrder(b.label),
    ),
  };
}

function bump(
  map: Map<string, { count: number; households: number }>,
  key: string,
  households: number,
) {
  const cur = map.get(key) ?? { count: 0, households: 0 };
  cur.count += 1;
  cur.households += households;
  map.set(key, cur);
}

function toRows(map: Map<string, { count: number; households: number }>) {
  return [...map.entries()].map(([label, v]) => ({
    label,
    count: v.count,
    households: v.households,
  }));
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function severityOrder(label: string) {
  const order: Record<string, number> = {
    Critical: 0,
    High: 1,
    Moderate: 2,
    Low: 3,
  };
  return order[label] ?? 99;
}
