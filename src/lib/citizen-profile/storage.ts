import { supabase } from "@/integrations/supabase/client";
import type { CitizenProfile, CitizenProfileInput } from "./constants";

// Types are auto-regenerated; cast through unknown for now.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;
import { PROFILE_STORAGE_KEY } from "./constants";

export async function createCitizenProfile(
  input: CitizenProfileInput,
): Promise<CitizenProfile> {
  const { data, error } = await supabase
    .from("citizen_profiles")
    .insert(input)
    .select()
    .single();

  if (error) throw error;
  if (typeof window !== "undefined" && data?.id) {
    localStorage.setItem(PROFILE_STORAGE_KEY, data.id);
  }
  return data as CitizenProfile;
}

export async function fetchCitizenProfile(id: string): Promise<CitizenProfile | null> {
  const { data, error } = await supabase
    .from("citizen_profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return (data as CitizenProfile) ?? null;
}

export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_STORAGE_KEY);
}

export function clearStoredProfileId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}
