import type { GoalCategory } from "@/lib/navigator/types";
import type { GoalConnection, SchemeRelationship } from "./types";

const SCHEME_CATEGORY_TO_GOALS: Record<string, GoalCategory[]> = {
  Students: ["Education", "Skill Development"],
  Entrepreneurs: ["Entrepreneurship", "Skill Development"],
  Farmers: ["Agriculture"],
  "Senior Citizens": ["Retirement"],
  "Health & Social Security": ["Healthcare"],
  Women: ["Women's Empowerment"],
};

export function goalsForCategory(category: string): GoalCategory[] {
  return SCHEME_CATEGORY_TO_GOALS[category] ?? ["General Welfare"];
}

/** Group scheme relationships into navigator goal buckets. */
export function buildGoalConnections(
  schemes: SchemeRelationship[],
): GoalConnection[] {
  const buckets = new Map<GoalCategory, GoalConnection>();
  for (const s of schemes) {
    for (const g of s.goalCategories) {
      const cur = buckets.get(g) ?? {
        category: g,
        schemeIds: [],
        memberIds: [],
      };
      cur.schemeIds.push(s.schemeId);
      for (const mid of s.relatedMemberIds) {
        if (!cur.memberIds.includes(mid)) cur.memberIds.push(mid);
      }
      buckets.set(g, cur);
    }
  }
  // Featured categories first.
  const order: GoalCategory[] = [
    "Education",
    "Entrepreneurship",
    "Retirement",
    "Healthcare",
    "Agriculture",
    "Women's Empowerment",
    "Skill Development",
    "General Welfare",
  ];
  return order
    .map((c) => buckets.get(c))
    .filter((c): c is GoalConnection => !!c && c.schemeIds.length > 0);
}
