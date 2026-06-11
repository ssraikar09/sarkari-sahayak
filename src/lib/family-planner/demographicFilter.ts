import type { EligibilityRecommendation } from "@/lib/eligibility";
import type { FamilyMember } from "./types";

const WOMEN_KEYWORDS = ["women", "woman", "girl", "mahila", "female", "maternity", "matru"];
const MEN_KEYWORDS = ["men only", "male only", "for men", "boys only"];

function textOf(r: EligibilityRecommendation): string {
  const s = r.scheme;
  return `${s.scheme_name} ${s.category} ${s.description} ${s.eligibility_criteria}`.toLowerCase();
}

/**
 * Apply demographic-aware gating on top of the base eligibility engine results.
 * Returns only recommendations that pass gender / age / occupation constraints
 * AND have at least 2 matched criteria.
 */
export function filterRecommendationsForMember(
  recs: EligibilityRecommendation[],
  member: { gender: string; age: number; occupation: string },
): EligibilityRecommendation[] {
  const gender = member.gender;
  const age = member.age;
  const occupation = member.occupation;

  return recs.filter((r) => {
    // Minimum threshold: at least 2 criteria matched.
    if (r.matchedCount < 2) return false;

    const cat = r.scheme.category;
    const text = textOf(r);

    // Gender-aware filtering.
    if (cat === "Women" || WOMEN_KEYWORDS.some((k) => text.includes(k))) {
      if (gender !== "Female") return false;
    }
    if (MEN_KEYWORDS.some((k) => text.includes(k))) {
      if (gender !== "Male") return false;
    }

    // Age-aware filtering.
    if (cat === "Students") {
      if (age < 5 || age > 30) return false;
    }
    if (cat === "Senior Citizens") {
      if (age < 60) return false;
    }

    // Occupation-aware filtering.
    if (cat === "Farmers") {
      if (occupation !== "Farmer") return false;
    }
    if (cat === "Entrepreneurs") {
      if (occupation !== "Entrepreneur") return false;
    }

    return true;
  });
}
