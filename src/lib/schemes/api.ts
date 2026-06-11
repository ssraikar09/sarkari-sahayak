import { supabase } from "@/integrations/supabase/client";
import type { GovernmentScheme, SchemeFilters } from "./types";

// Generated Supabase types don't yet include government_schemes; cast for now.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listSchemes(filters: SchemeFilters = {}): Promise<GovernmentScheme[]> {
  let query = db
    .from("government_schemes")
    .select("*")
    .order("scheme_name", { ascending: true });

  if (filters.state) query = query.eq("state", filters.state);
  if (filters.category) query = query.eq("category", filters.category);
  if (filters.scope) query = query.eq("scheme_scope", filters.scope);
  if (filters.search && filters.search.trim()) {
    const term = filters.search.trim().replace(/[%_]/g, "");
    query = query.or(
      `scheme_name.ilike.%${term}%,description.ilike.%${term}%`,
    );
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as GovernmentScheme[];
}

export async function getSchemeById(id: string): Promise<GovernmentScheme | null> {
  const { data, error } = await db
    .from("government_schemes")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as GovernmentScheme) ?? null;
}
