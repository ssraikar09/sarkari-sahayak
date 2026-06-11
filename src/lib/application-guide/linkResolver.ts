import type { GovernmentScheme } from "@/lib/schemes";

export type LinkStatus = "direct_link" | "department_link" | "unavailable";

export type ResolvedLink = {
  url: string | null;
  status: LinkStatus;
  label: string;
  source: "scheme" | "application_process" | "scheme_fallback" | "state_department" | "none";
};

/* ------------- URL validation ------------- */

export function isValidHttpUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "http:" || parsed.protocol === "https:" ? trimmed : null;
  } catch {
    return null;
  }
}

export function extractUrlsFromText(text: string | null | undefined): string[] {
  if (!text) return [];
  const urlRegex = /https?:\/\/[^\s"'<>)]+/gi;
  return Array.from(new Set(text.match(urlRegex) ?? []))
    .map((u) => u.replace(/[.,;!?)]+$/, ""))
    .filter((u): u is string => Boolean(isValidHttpUrl(u)));
}

/* ------------- Known scheme fallback mapping ------------- */

type SchemeFallbackEntry = { keywords: string[]; url: string };

const SCHEME_FALLBACKS: SchemeFallbackEntry[] = [
  { keywords: ["pm-kisan", "pm kisan", "pradhan mantri kisan"], url: "https://pmkisan.gov.in/" },
  { keywords: ["mudra"], url: "https://www.mudra.org.in/" },
  { keywords: ["ayushman bharat", "pmjay", "pm-jay"], url: "https://beneficiary.nha.gov.in/" },
  { keywords: ["national scholarship", "nsp scholarship", "scholarship portal"], url: "https://scholarships.gov.in/" },
  { keywords: ["atal pension", "apy"], url: "https://www.npscra.nsdl.co.in/" },
  { keywords: ["pmay", "pradhan mantri awas"], url: "https://pmaymis.gov.in/" },
  { keywords: ["ujjwala"], url: "https://www.pmuy.gov.in/" },
  { keywords: ["sukanya samriddhi"], url: "https://www.india.gov.in/spotlight/sukanya-samriddhi-yojana" },
  { keywords: ["jan dhan", "pmjdy"], url: "https://pmjdy.gov.in/" },
  { keywords: ["e-shram", "eshram"], url: "https://eshram.gov.in/" },
  { keywords: ["startup india"], url: "https://www.startupindia.gov.in/" },
  { keywords: ["stand up india", "stand-up india"], url: "https://www.standupmitra.in/" },
  { keywords: ["skill india", "pmkvy"], url: "https://www.pmkvyofficial.org/" },
  { keywords: ["mgnrega", "nrega"], url: "https://nrega.nic.in/" },
];

function matchSchemeFallback(scheme: GovernmentScheme): string | null {
  const name = scheme.scheme_name.toLowerCase();
  for (const entry of SCHEME_FALLBACKS) {
    if (entry.keywords.some((k) => name.includes(k))) return entry.url;
  }
  return null;
}

/* ------------- State department fallback ------------- */

const STATE_DEPARTMENT_PORTALS: Record<string, string> = {
  "andhra pradesh": "https://www.ap.gov.in/",
  "arunachal pradesh": "https://arunachalpradesh.gov.in/",
  "assam": "https://assam.gov.in/",
  "bihar": "https://state.bihar.gov.in/",
  "chhattisgarh": "https://cg.gov.in/",
  "goa": "https://www.goa.gov.in/",
  "gujarat": "https://gujaratindia.gov.in/",
  "haryana": "https://haryana.gov.in/",
  "himachal pradesh": "https://himachal.nic.in/",
  "jharkhand": "https://www.jharkhand.gov.in/",
  "karnataka": "https://www.karnataka.gov.in/",
  "kerala": "https://kerala.gov.in/",
  "madhya pradesh": "https://www.mp.gov.in/",
  "maharashtra": "https://www.maharashtra.gov.in/",
  "manipur": "https://manipur.gov.in/",
  "meghalaya": "https://meghalaya.gov.in/",
  "mizoram": "https://mizoram.gov.in/",
  "nagaland": "https://nagaland.gov.in/",
  "odisha": "https://odisha.gov.in/",
  "punjab": "https://punjab.gov.in/",
  "rajasthan": "https://rajasthan.gov.in/",
  "sikkim": "https://sikkim.gov.in/",
  "tamil nadu": "https://www.tn.gov.in/",
  "telangana": "https://www.telangana.gov.in/",
  "tripura": "https://tripura.gov.in/",
  "uttar pradesh": "https://up.gov.in/",
  "uttarakhand": "https://uk.gov.in/",
  "west bengal": "https://wb.gov.in/",
  "delhi": "https://delhi.gov.in/",
  "jammu and kashmir": "https://jk.gov.in/",
  "ladakh": "https://ladakh.gov.in/",
  "puducherry": "https://www.py.gov.in/",
  "chandigarh": "https://chandigarh.gov.in/",
};

function matchStateDepartment(scheme: GovernmentScheme): string | null {
  if (scheme.scheme_scope !== "State") return null;
  const key = (scheme.state ?? "").trim().toLowerCase();
  return STATE_DEPARTMENT_PORTALS[key] ?? null;
}

/* ------------- Resolver ------------- */

export type ResolvedOfficialLinks = {
  primary: ResolvedLink;
  apply: ResolvedLink | null;
  status: LinkStatus;
};

export function resolveOfficialLinks(scheme: GovernmentScheme): ResolvedOfficialLinks {
  const directScheme = isValidHttpUrl(scheme.official_link);
  const extracted = extractUrlsFromText(scheme.application_process);
  const directApply = extracted.find((u) => u !== directScheme) ?? null;

  if (directScheme) {
    return {
      primary: {
        url: directScheme,
        status: "direct_link",
        label: "Visit Official Portal",
        source: "scheme",
      },
      apply: directApply
        ? {
            url: directApply,
            status: "direct_link",
            label: "Apply Online",
            source: "application_process",
          }
        : null,
      status: "direct_link",
    };
  }

  if (directApply) {
    return {
      primary: {
        url: directApply,
        status: "direct_link",
        label: "Apply Online",
        source: "application_process",
      },
      apply: null,
      status: "direct_link",
    };
  }

  // Known scheme fallback (national).
  const schemeFallback = matchSchemeFallback(scheme);
  if (schemeFallback) {
    return {
      primary: {
        url: schemeFallback,
        status: "department_link",
        label: "Visit Official Portal",
        source: "scheme_fallback",
      },
      apply: null,
      status: "department_link",
    };
  }

  // State department fallback.
  const stateFallback = matchStateDepartment(scheme);
  if (stateFallback) {
    return {
      primary: {
        url: stateFallback,
        status: "department_link",
        label: "Visit State Department Portal",
        source: "state_department",
      },
      apply: null,
      status: "department_link",
    };
  }

  return {
    primary: { url: null, status: "unavailable", label: "Unavailable", source: "none" },
    apply: null,
    status: "unavailable",
  };
}
