import { supabase } from "@/integrations/supabase/client";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

/**
 * Record an unsuccessful scheme search so the team can prioritise which
 * schemes to add to the verified knowledge base next.
 * Errors are swallowed — logging must never break the user experience.
 */
export async function logUnsuccessfulSearch(
  searchQuery: string,
  stateSelected?: string | null,
): Promise<void> {
  const query = searchQuery.trim();
  if (!query) return;
  try {
    await db.from("scheme_search_logs").insert({
      search_query: query,
      state_selected: stateSelected ?? null,
    });
  } catch (err) {
    console.warn("Failed to log unsuccessful scheme search", err);
  }
}

export type SchemeSearchLogInput = {
  query?: string | null;
  state?: string | null;
  category?: string | null;
  scope?: string | null;
};

/**
 * Record a scheme search/filter interaction. We persist either the keyword
 * query or — when only a filter is set — the filter value as the query text,
 * so Module 11 analytics can aggregate "Most Searched Categories" from this
 * single table. Errors are swallowed.
 */
export async function logSchemeSearch(input: SchemeSearchLogInput): Promise<void> {
  const q = (input.query ?? "").trim();
  const category = (input.category ?? "").trim();
  const scope = (input.scope ?? "").trim();
  // Prefer the user's typed query. Fall back to category/scope filter values so
  // category-only browsing still feeds the analytics aggregator.
  const searchQuery = q || category || scope;
  if (!searchQuery) return;
  try {
    await db.from("scheme_search_logs").insert({
      search_query: searchQuery,
      state_selected: input.state ?? null,
    });
  } catch (err) {
    console.warn("Failed to log scheme search", err);
  }
}
