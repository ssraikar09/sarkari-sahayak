import type { GovernmentScheme } from "@/lib/schemes";
import type { SchemeDecision } from "@/lib/decision-engine/types";
import type { ForecastItem, RoadmapYear } from "./types";

const CATEGORY_BENEFIT_INR: Record<string, number> = {
  Education: 25000,
  Scholarship: 30000,
  Healthcare: 20000,
  Agriculture: 18000,
  Entrepreneurship: 50000,
  Employment: 15000,
  Pension: 36000,
  "Social Security": 24000,
  Housing: 120000,
  "Women & Child": 18000,
  "Skill Development": 12000,
};

export function estimateAnnualBenefit(schemes: GovernmentScheme[]): number {
  return schemes.reduce((sum, s) => sum + (CATEGORY_BENEFIT_INR[s.category] ?? 10000), 0);
}

export function forecastUpcoming(years: RoadmapYear[]): ForecastItem[] {
  const items: ForecastItem[] = [];
  years.forEach((y, idx) => {
    for (const s of y.schemes.slice(0, 2)) {
      items.push({
        scheme: s,
        yearsAway: idx,
        reason: `Aligned with ${y.focus.toLowerCase()} in ${y.year}`,
      });
    }
  });
  return items.slice(0, 8);
}

export function findMissed(decisions: SchemeDecision[]): ForecastItem[] {
  return decisions
    .filter((d) => d.status === "partial")
    .slice(0, 6)
    .map((d) => ({
      scheme: d.scheme,
      yearsAway: 0,
      reason: d.unmet[0]?.reason ?? "Eligibility gap can still be closed",
    }));
}

export function longTermBenefit(years: RoadmapYear[]): number {
  return years.reduce((sum, y) => sum + estimateAnnualBenefit(y.schemes), 0);
}
