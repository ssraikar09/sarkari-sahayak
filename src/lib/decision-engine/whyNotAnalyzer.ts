import type { SchemeDecision, WhyNotExplanation } from "./types";

const ACTION_HINTS: Record<string, string> = {
  state: "Check whether a similar scheme exists for your state, or update your state if it changed.",
  occupation: "Update your occupation in your citizen profile if it no longer reflects your current work.",
  income: "Provide an updated income certificate — your bracket determines income-tested benefits.",
  age: "This scheme is age-restricted; revisit it when you reach the eligible age band.",
  disability: "If a Divyang certificate applies, update your profile to unlock disability-specific schemes.",
};

export function explainWhyNot(decision: SchemeDecision): WhyNotExplanation {
  const { scheme, matched, unmet, status } = decision;
  const summary =
    status === "eligible"
      ? `You appear eligible for ${scheme.scheme_name}.`
      : status === "partial"
        ? `${scheme.scheme_name} partially aligns with your profile — a few criteria did not match.`
        : `You do not currently qualify for ${scheme.scheme_name}.`;

  const suggestedActions = Array.from(
    new Set(unmet.map((u) => ACTION_HINTS[u.criterion]).filter(Boolean)),
  );

  return {
    scheme,
    status,
    matchedCriteria: matched,
    missingCriteria: unmet,
    summary,
    suggestedActions,
  };
}
