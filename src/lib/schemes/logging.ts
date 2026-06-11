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
