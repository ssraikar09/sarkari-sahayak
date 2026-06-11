import { supabase } from "@/integrations/supabase/client";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import { extractKeywords } from "./intent";
import type { RetrievedScheme } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MAX_RETRIEVED = 6;

/**
 * Hybrid retrieval over the verified government_schemes table.
 * - Lexical search across scheme_name + description + eligibility text.
 * - Profile-aware boosting (state + scope + category alignment).
 * Returns the top scored schemes.
 */
export async function retrieveSchemes(
  query: string,
  profile: CitizenProfile | null,
): Promise<RetrievedScheme[]> {
  const keywords = extractKeywords(query);
  const rows = await fetchCandidateSchemes(keywords, profile);

  const scored: RetrievedScheme[] = rows.map((scheme) => {
    const haystack =
      `${scheme.scheme_name} ${scheme.description} ${scheme.eligibility_criteria} ${scheme.benefits} ${scheme.category}`.toLowerCase();

    const matchedTerms = keywords.filter((k) => haystack.includes(k));
    let score = matchedTerms.length * 3;

    // Strong boost for direct scheme-name hits.
    for (const k of keywords) {
      if (scheme.scheme_name.toLowerCase().includes(k)) score += 5;
    }

    // Profile-aware boosting.
    if (profile) {
      if (scheme.scheme_scope === "National" || scheme.state === profile.state) {
        score += 2;
      }
      if (occupationMatchesCategory(profile.occupation, scheme.category)) {
        score += 2;
      }
    }

    return { scheme, score, matchedTerms };
  });

  return scored
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVED);
}

async function fetchCandidateSchemes(
  keywords: string[],
  profile: CitizenProfile | null,
): Promise<GovernmentScheme[]> {
  let query = db.from("government_schemes").select("*").limit(60);

  if (keywords.length > 0) {
    // Build an OR clause across the most important text columns.
    const clauses = keywords
      .slice(0, 6)
      .flatMap((k) => {
        const safe = k.replace(/[%_,()]/g, "");
        return [
          `scheme_name.ilike.%${safe}%`,
          `description.ilike.%${safe}%`,
          `eligibility_criteria.ilike.%${safe}%`,
          `category.ilike.%${safe}%`,
        ];
      })
      .join(",");
    query = query.or(clauses);
  } else if (profile) {
    // No useful keywords — fall back to the citizen's state + national.
    query = query.or(
      `scheme_scope.eq.National,state.eq.${profile.state.replace(/,/g, "")}`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GovernmentScheme[];
}

const OCCUPATION_CATEGORY: Record<string, string[]> = {
  Farmer: ["Farmers"],
  Student: ["Students"],
  Homemaker: ["Women", "Health & Social Security"],
  Worker: ["Health & Social Security", "Entrepreneurs"],
  Entrepreneur: ["Entrepreneurs"],
  "Senior Citizen": ["Senior Citizens", "Health & Social Security"],
};

function occupationMatchesCategory(occupation: string, category: string): boolean {
  return (OCCUPATION_CATEGORY[occupation] ?? []).includes(category);
}
