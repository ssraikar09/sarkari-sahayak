import type { HouseholdInsight, MemberGap } from "./types";

/**
 * Rule-based household insights derived from the welfare gap analysis.
 * Deterministic + explainable — no external AI dependency.
 */
export function generateInsights(input: {
  members: MemberGap[];
  missedByCategory: Record<string, number>;
  totalMissed: number;
}): HouseholdInsight[] {
  const insights: HouseholdInsight[] = [];
  const cat = input.missedByCategory;

  if ((cat["Senior Citizens"] ?? 0) + (cat["Senior Citizen"] ?? 0) >= 1) {
    insights.push({
      id: "senior",
      title: "Senior citizen support may be underused",
      detail:
        "Your family may benefit from exploring senior citizen pension and social security schemes.",
    });
  }
  if ((cat["Students"] ?? 0) + (cat["Student"] ?? 0) >= 1) {
    insights.push({
      id: "education",
      title: "Educational support opportunities appear underutilized",
      detail:
        "Scholarship and skilling schemes for students in your household have not been explored yet.",
    });
  }
  if ((cat["Health & Social Security"] ?? 0) >= 1) {
    insights.push({
      id: "health",
      title: "Health protection coverage could be improved",
      detail:
        "Consider reviewing health insurance and social protection schemes available to your household.",
    });
  }
  if ((cat["Women"] ?? 0) >= 1) {
    insights.push({
      id: "women",
      title: "Women-focused welfare schemes are available",
      detail:
        "Maternity, savings and entrepreneurship schemes for women in your family are worth exploring.",
    });
  }
  if ((cat["Farmers"] ?? 0) + (cat["Farmer"] ?? 0) >= 1) {
    insights.push({
      id: "farmer",
      title: "Agricultural support schemes look unexplored",
      detail:
        "Income-support and crop-related schemes may apply to farmers in your household.",
    });
  }
  if ((cat["Entrepreneurs"] ?? 0) + (cat["Entrepreneur"] ?? 0) >= 1) {
    insights.push({
      id: "entrepreneur",
      title: "Entrepreneurship credit opportunities are available",
      detail:
        "Members running or planning a small business may qualify for credit-linked schemes.",
    });
  }

  const heavy = input.members
    .filter((m) => m.missedCount >= 3)
    .sort((a, b) => b.missedCount - a.missedCount)
    .slice(0, 1);
  for (const m of heavy) {
    insights.push({
      id: `member-${m.memberId}`,
      title: `${m.name} has ${m.missedCount} unexplored opportunities`,
      detail: `Reviewing ${m.name}'s eligible schemes could unlock additional welfare benefits.`,
    });
  }

  if (insights.length === 0 && input.totalMissed === 0) {
    insights.push({
      id: "well-covered",
      title: "Your household is well covered",
      detail:
        "Most eligible schemes have been explored. Keep checking back as new schemes are added.",
    });
  }

  return insights.slice(0, 5);
}
