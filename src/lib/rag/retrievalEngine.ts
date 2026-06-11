import { supabase } from "@/integrations/supabase/client";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import { extractKeywords } from "./intent";
import type { AssistantIntent, RetrievedScheme } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

const MAX_RETRIEVED = 3;
const MIN_SCORE = 4;

/**
 * Hybrid retrieval over the verified government_schemes table.
 * Ranking priority:
 *   1. Exact / phrase scheme-name match (highest)
 *   2. Category similarity
 *   3. Profile-aware boosting (state + occupation alignment)
 * Caps output at 3 schemes and filters out low-confidence matches.
 */
export async function retrieveSchemes(
  query: string,
  profile: CitizenProfile | null,
  intent: AssistantIntent = "general",
): Promise<RetrievedScheme[]> {
  const keywords = extractKeywords(query);
  const qLower = query.toLowerCase();
  const rows = await fetchCandidateSchemes(keywords, profile);

  const scored: RetrievedScheme[] = rows.map((scheme) => {
    const nameLower = scheme.scheme_name.toLowerCase();
    const categoryLower = scheme.category.toLowerCase();
    const haystack =
      `${nameLower} ${scheme.description} ${scheme.eligibility_criteria} ${scheme.benefits} ${categoryLower}`.toLowerCase();

    const matchedTerms = keywords.filter((k) => haystack.includes(k));
    let score = 0;

    // 1) Exact scheme-name match — highest priority.
    if (nameLower === qLower) {
      score += 100;
    } else if (qLower.includes(nameLower) || nameLower.includes(qLower)) {
      score += 40;
    }
    // Per-keyword name hits.
    let nameKeywordHits = 0;
    for (const k of keywords) {
      if (nameLower.includes(k)) {
        score += 8;
        nameKeywordHits += 1;
      }
    }
    if (keywords.length > 0 && nameKeywordHits === keywords.length) {
      score += 10; // all keywords appear in the name
    }

    // 2) Category similarity — second priority.
    for (const k of keywords) {
      if (categoryLower.includes(k)) score += 5;
    }

    // 3) Profile-aware boosting — third priority.
    if (profile) {
      if (scheme.scheme_scope === "National" || scheme.state === profile.state) {
        score += 2;
      }
      if (occupationMatchesCategory(profile.occupation, scheme.category)) {
        score += 2;
      }
    }

    // Generic content-match bonus (lowest weight).
    score += matchedTerms.length * 1;

    // "Documents Required" intent — strengthen name-match priority further.
    if (intent === "documents" && nameKeywordHits > 0) {
      score += 6;
    }

    return { scheme, score, matchedTerms };
  });

  return scored
    .filter((r) => r.score >= MIN_SCORE && r.matchedTerms.length > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_RETRIEVED);
}

async function fetchCandidateSchemes(
  keywords: string[],
  profile: CitizenProfile | null,
): Promise<GovernmentScheme[]> {
  let query = db.from("government_schemes").select("*").limit(60);

  if (keywords.length > 0) {
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
