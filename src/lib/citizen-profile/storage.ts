import type { CitizenProfile, CitizenProfileInput } from "./constants";
import { PROFILE_STORAGE_KEY } from "./constants";
import {
  createCitizenProfileFn,
  fetchCitizenProfileFn,
} from "./profile.functions";

export async function createCitizenProfile(
  input: CitizenProfileInput,
): Promise<CitizenProfile> {
  const data = (await createCitizenProfileFn({ data: input })) as CitizenProfile;
  if (typeof window !== "undefined" && data?.id) {
    localStorage.setItem(PROFILE_STORAGE_KEY, data.id);
  }
  return data;
}

export async function fetchCitizenProfile(id: string): Promise<CitizenProfile | null> {
  const data = (await fetchCitizenProfileFn({ data: { id } })) as CitizenProfile | null;
  return data ?? null;
}

export function getStoredProfileId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(PROFILE_STORAGE_KEY);
}

export function clearStoredProfileId() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}
