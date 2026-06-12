import type {
  CategoryCount,
  GroupExclusion,
  UnderutilizedScheme,
} from "./types";

type SchemeMeta = {
  id: string;
  scheme_name: string;
  category: string;
};

const GROUP_OCCUPATION_HINTS: Record<string, string[]> = {
  Farmers: ["farmer", "farming", "agri", "agriculture", "kisan"],
  Women: [], // resolved via gender
  Students: ["student", "school", "college", "scholar"],
  "Senior Citizens": [], // resolved via age
  Entrepreneurs: ["entrepreneur", "business", "self-employed", "shop", "trader", "msme", "startup"],
};

export type ProfileLite = {
  id: string;
  age: number;
  gender: string;
  occupation: string;
};

export function classifyGroup(p: ProfileLite): string[] {
  const groups: string[] = [];
  const occ = (p.occupation ?? "").toLowerCase();
  if ((p.gender ?? "").toLowerCase().startsWith("f")) groups.push("Women");
  if (p.age >= 60) groups.push("Senior Citizens");
  for (const [group, hints] of Object.entries(GROUP_OCCUPATION_HINTS)) {
    if (!hints.length) continue;
    if (hints.some((h) => occ.includes(h))) groups.push(group);
  }
  return groups;
}

export function topMissedCategories(
  missedSchemeIds: string[],
  schemeIndex: Map<string, SchemeMeta>,
  n = 5,
): CategoryCount[] {
  const counts = new Map<string, number>();
  for (const id of missedSchemeIds) {
    const s = schemeIndex.get(id);
    if (!s) continue;
    counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, n);
}

export function buildUnderutilizedSchemes(input: {
  eligibilityByScheme: Map<string, number>;
  exploredByScheme: Map<string, number>;
  schemeIndex: Map<string, SchemeMeta>;
  minEligible?: number;
  n?: number;
}): UnderutilizedScheme[] {
  const { eligibilityByScheme, exploredByScheme, schemeIndex } = input;
  const minEligible = input.minEligible ?? 2;
  const n = input.n ?? 5;
  const rows: UnderutilizedScheme[] = [];
  for (const [id, eligible] of eligibilityByScheme) {
    if (eligible < minEligible) continue;
    const s = schemeIndex.get(id);
    if (!s) continue;
    const explored = exploredByScheme.get(id) ?? 0;
    const utilizationRate = eligible > 0 ? explored / eligible : 0;
    rows.push({
      id,
      name: s.scheme_name,
      category: s.category,
      eligibleCount: eligible,
      exploredCount: explored,
      utilizationRate,
    });
  }
  return rows
    .sort((a, b) => a.utilizationRate - b.utilizationRate || b.eligibleCount - a.eligibleCount)
    .slice(0, n);
}

export function buildUnderservedGroups(input: {
  perProfile: {
    profile: ProfileLite;
    eligibleCount: number;
    missedCount: number;
    opportunityScore: number;
  }[];
}): GroupExclusion[] {
  const buckets = new Map<
    string,
    { missed: number; score: number; households: number }
  >();
  for (const row of input.perProfile) {
    const groups = classifyGroup(row.profile);
    for (const g of groups) {
      const cur = buckets.get(g) ?? { missed: 0, score: 0, households: 0 };
      cur.missed += row.missedCount;
      cur.score += row.opportunityScore;
      cur.households += 1;
      buckets.set(g, cur);
    }
  }
  return [...buckets.entries()]
    .map(([group, v]) => ({
      group,
      affectedHouseholds: v.households,
      averageMissed: v.households ? Math.round(v.missed / v.households) : 0,
      averageOpportunityScore: v.households ? Math.round(v.score / v.households) : 0,
    }))
    .sort((a, b) => a.averageOpportunityScore - b.averageOpportunityScore)
    .slice(0, 5);
}
