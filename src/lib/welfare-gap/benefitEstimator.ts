/**
 * Estimate the annual rupee value of a scheme. Uses a published-value table
 * for well-known schemes and falls back to category-based defaults so the
 * dashboard always shows a reasonable, explainable estimate.
 *
 * Values are conservative annual averages and are clearly framed as
 * estimates in the UI.
 */

type KnownEntry = { match: RegExp; valueINR: number };

const KNOWN: KnownEntry[] = [
  { match: /pm[\s-]?kisan/i, valueINR: 6000 },
  { match: /kisan\s+samman/i, valueINR: 6000 },
  { match: /atal\s+pension/i, valueINR: 12000 },
  { match: /pradhan\s+mantri\s+jeevan\s+jyoti|pmjjby/i, valueINR: 330 },
  { match: /pradhan\s+mantri\s+suraksha\s+bima|pmsby/i, valueINR: 20 },
  { match: /ayushman\s+bharat|pm[\s-]?jay/i, valueINR: 500000 },
  { match: /ujjwala/i, valueINR: 1600 },
  { match: /post[\s-]?matric\s+scholarship|scholarship/i, valueINR: 20000 },
  { match: /pre[\s-]?matric\s+scholarship/i, valueINR: 10000 },
  { match: /mudra/i, valueINR: 50000 },
  { match: /stand[\s-]?up\s+india/i, valueINR: 100000 },
  { match: /sukanya\s+samriddhi/i, valueINR: 12000 },
  { match: /matru\s+vandana|pmmvy/i, valueINR: 5000 },
  { match: /national\s+pension|nps/i, valueINR: 12000 },
  { match: /old\s+age\s+pension|vridha|indira\s+gandhi\s+national\s+old/i, valueINR: 6000 },
  { match: /widow\s+pension/i, valueINR: 6000 },
  { match: /disability\s+pension|divyang/i, valueINR: 9000 },
  { match: /e[\s-]?shram/i, valueINR: 24000 },
  { match: /awas\s+yojana|pmay/i, valueINR: 40000 },
  { match: /annapurna|antyodaya|food\s+security|ration/i, valueINR: 12000 },
  { match: /skill\s+india|kaushal/i, valueINR: 8000 },
];

const CATEGORY_DEFAULTS: Record<string, number> = {
  Farmer: 6000,
  Farmers: 6000,
  Women: 5000,
  Student: 10000,
  Students: 10000,
  "Senior Citizen": 9000,
  "Senior Citizens": 9000,
  Entrepreneur: 25000,
  Entrepreneurs: 25000,
  "Health & Social Security": 10000,
};

export function estimateAnnualValue(scheme: {
  scheme_name: string;
  category: string;
  benefits?: string | null;
}): { valueINR: number; basis: "known" | "estimated" } {
  const hay = `${scheme.scheme_name} ${scheme.benefits ?? ""}`;
  for (const k of KNOWN) {
    if (k.match.test(hay)) return { valueINR: k.valueINR, basis: "known" };
  }
  // Try extracting an explicit ₹ amount from benefits text.
  const benefits = scheme.benefits ?? "";
  const m =
    benefits.match(/₹\s?([\d,]+)(?:\s?(?:\/|per)\s?(?:year|annum|yr))?/i) ||
    benefits.match(/Rs\.?\s?([\d,]+)/i);
  if (m) {
    const n = Number(m[1].replace(/,/g, ""));
    if (Number.isFinite(n) && n >= 500 && n <= 1_000_000) {
      return { valueINR: n, basis: "estimated" };
    }
  }
  const fallback = CATEGORY_DEFAULTS[scheme.category] ?? 5000;
  return { valueINR: fallback, basis: "estimated" };
}

export function formatINR(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return "₹0";
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}
