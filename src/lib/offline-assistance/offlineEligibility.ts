import type {
  CachedScheme,
  OfflineEligibilityInput,
  OfflineEligibilityMatch,
  OfflineEligibilityResult,
} from "./types";

const INCOME_RANK: Record<string, number> = {
  "Less than ₹1 lakh": 1,
  "₹1–3 lakh": 2,
  "₹3–5 lakh": 3,
  "Above ₹5 lakh": 4,
};

function textMatch(text: string, needle: string): boolean {
  return text.toLowerCase().includes(needle.toLowerCase());
}

function evaluateScheme(
  scheme: CachedScheme,
  input: OfflineEligibilityInput,
): OfflineEligibilityMatch | null {
  const signals: string[] = [];

  if (scheme.scheme_scope === "National") {
    signals.push("National scheme — available across India");
  } else if (scheme.state === input.state) {
    signals.push(`State match: ${input.state}`);
  } else {
    return null;
  }

  const elig = scheme.eligibility_criteria ?? "";
  const cat = scheme.category ?? "";

  if (input.occupation && (textMatch(elig, input.occupation) || textMatch(cat, input.occupation))) {
    signals.push(`Occupation match: ${input.occupation}`);
  }

  if (input.disability_status && (textMatch(elig, "disab") || textMatch(cat, "disab"))) {
    signals.push("Disability provisions found");
  }

  const incomeRank = INCOME_RANK[input.annual_income] ?? 0;
  if (incomeRank <= 2 && (textMatch(elig, "bpl") || textMatch(elig, "low income") || textMatch(elig, "poverty"))) {
    signals.push("Low-income provisions found");
  }

  if (input.age >= 60 && (textMatch(elig, "senior") || textMatch(cat, "senior"))) {
    signals.push("Senior citizen criteria met");
  }
  if (input.age <= 25 && (textMatch(elig, "student") || textMatch(cat, "student"))) {
    signals.push("Student criteria met");
  }

  if (signals.length < 2) return null;

  const confidence: OfflineEligibilityMatch["confidence"] =
    signals.length >= 4 ? "high" : signals.length === 3 ? "medium" : "low";

  return {
    schemeId: scheme.id,
    schemeName: scheme.scheme_name,
    category: scheme.category,
    scope: scheme.scheme_scope,
    matchedSignals: signals,
    confidence,
  };
}

export function runOfflineEligibility(
  schemes: CachedScheme[],
  input: OfflineEligibilityInput,
): OfflineEligibilityResult {
  const matches = schemes
    .map((s) => evaluateScheme(s, input))
    .filter((m): m is OfflineEligibilityMatch => m !== null)
    .sort((a, b) => b.matchedSignals.length - a.matchedSignals.length);

  return {
    generatedAt: new Date().toISOString(),
    input,
    matches,
    basedOnCachedSchemes: schemes.length,
    disclaimer:
      "Offline Estimate — generated using locally synchronized welfare datasets. Sync required for latest updates.",
  };
}
