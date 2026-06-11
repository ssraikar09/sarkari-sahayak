import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type {
  AgeGroup,
  CriterionEvaluation,
  IncomeBracketKey,
} from "./types";

// ---------- Profile derivations ----------

export function getAgeGroup(age: number): AgeGroup {
  if (age < 18) return "Child";
  if (age < 35) return "Youth";
  if (age < 60) return "Adult";
  if (age < 80) return "Senior";
  return "Super Senior";
}

export function getIncomeKey(annualIncome: string): IncomeBracketKey {
  if (annualIncome.includes("Less than")) return "very_low";
  if (annualIncome.includes("1–3")) return "low";
  if (annualIncome.includes("3–5")) return "middle";
  return "high";
}

/**
 * Occupations a scheme category typically serves. A scheme is considered
 * occupationally aligned when the citizen's occupation appears here, OR the
 * category is broadly applicable (Health & Social Security).
 */
const CATEGORY_OCCUPATIONS: Record<string, string[]> = {
  Farmers: ["Farmer"],
  Students: ["Student"],
  Women: ["Homemaker", "Student", "Worker", "Entrepreneur", "Farmer"],
  "Senior Citizens": ["Senior Citizen"],
  Entrepreneurs: ["Entrepreneur", "Worker"],
  "Health & Social Security": [
    "Farmer",
    "Student",
    "Homemaker",
    "Worker",
    "Entrepreneur",
    "Senior Citizen",
    "Other",
  ],
};

const LOW_INCOME_KEYWORDS = [
  "bpl",
  "below poverty",
  "low income",
  "low-income",
  "economically weaker",
  "ews",
  "poor",
  "marginal",
  "small farmer",
  "small and marginal",
  "annual income",
  "₹",
  "lakh",
  "rs.",
  "rupees",
];

const DISABILITY_KEYWORDS = [
  "disab",
  "divyang",
  "differently abled",
  "differently-abled",
  "pwd",
];

const AGE_KEYWORDS_BY_GROUP: Record<AgeGroup, string[]> = {
  Child: ["child", "minor", "below 18", "under 18", "school"],
  Youth: ["youth", "young", "18-", "21-", "student", "graduate"],
  Adult: ["adult", "working age", "18-60", "18 to 60"],
  Senior: ["senior", "60 years", "above 60", "elderly", "old age", "pension"],
  "Super Senior": ["80 years", "super senior", "elderly", "old age"],
};

// ---------- Criterion evaluators ----------

export function evaluateState(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation {
  const isNational = scheme.scheme_scope === "National";
  const stateMatches = scheme.state === profile.state;
  const matched = isNational || stateMatches;
  return {
    criterion: "state",
    applicable: true,
    matched,
    reason: matched
      ? isNational
        ? "Scheme is available nationwide."
        : `Scheme is available in your selected state (${profile.state}).`
      : `Scheme is only available in ${scheme.state}.`,
  };
}

export function evaluateOccupation(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation {
  const occupations = CATEGORY_OCCUPATIONS[scheme.category] ?? [];
  const matched = occupations.includes(profile.occupation);
  return {
    criterion: "occupation",
    applicable: true,
    matched,
    reason: matched
      ? `Your occupation (${profile.occupation}) aligns with this scheme's "${scheme.category}" category.`
      : `This scheme primarily targets ${scheme.category.toLowerCase()}; your occupation is ${profile.occupation}.`,
  };
}

export function evaluateIncome(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation {
  const text = scheme.eligibility_criteria.toLowerCase();
  const mentionsIncome = LOW_INCOME_KEYWORDS.some((k) => text.includes(k));
  const incomeKey = getIncomeKey(profile.annual_income);

  if (!mentionsIncome) {
    return {
      criterion: "income",
      applicable: false,
      matched: false,
      reason: "Scheme has no specific income restriction.",
    };
  }

  // Low/very low income aligns with most welfare schemes that mention income.
  const matched = incomeKey === "very_low" || incomeKey === "low" || incomeKey === "middle";
  return {
    criterion: "income",
    applicable: true,
    matched,
    reason: matched
      ? `Your income category (${profile.annual_income}) satisfies the scheme's income eligibility.`
      : `Your income (${profile.annual_income}) may exceed the scheme's income ceiling.`,
  };
}

export function evaluateAge(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation {
  const group = getAgeGroup(profile.age);
  const text = `${scheme.eligibility_criteria} ${scheme.category}`.toLowerCase();

  // Category-driven defaults.
  if (scheme.category === "Senior Citizens") {
    const matched = group === "Senior" || group === "Super Senior";
    return {
      criterion: "age",
      applicable: true,
      matched,
      reason: matched
        ? `Your age (${profile.age}) qualifies for senior citizen schemes.`
        : `Scheme is for citizens aged 60 and above; you are ${profile.age}.`,
    };
  }
  if (scheme.category === "Students") {
    const matched = group === "Child" || group === "Youth";
    return {
      criterion: "age",
      applicable: true,
      matched,
      reason: matched
        ? `Your age group (${group}) qualifies for student schemes.`
        : `Scheme is targeted at students; your age group is ${group}.`,
    };
  }

  const keywords = AGE_KEYWORDS_BY_GROUP[group];
  const mentions = keywords.some((k) => text.includes(k));
  if (!mentions) {
    return {
      criterion: "age",
      applicable: false,
      matched: false,
      reason: "Scheme has no specific age restriction.",
    };
  }
  return {
    criterion: "age",
    applicable: true,
    matched: true,
    reason: `Your age group (${group}) meets the scheme's age requirement.`,
  };
}

export function evaluateDisability(
  profile: CitizenProfile,
  scheme: GovernmentScheme,
): CriterionEvaluation {
  const text = scheme.eligibility_criteria.toLowerCase();
  const mentions = DISABILITY_KEYWORDS.some((k) => text.includes(k));
  if (!mentions) {
    return {
      criterion: "disability",
      applicable: false,
      matched: false,
      reason: "Scheme is not disability-specific.",
    };
  }
  return {
    criterion: "disability",
    applicable: true,
    matched: profile.disability_status,
    reason: profile.disability_status
      ? "Disability criteria are met based on your profile."
      : "Scheme targets persons with disabilities; your profile does not indicate disability.",
  };
}
