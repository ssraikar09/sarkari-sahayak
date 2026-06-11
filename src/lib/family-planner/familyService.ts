import { supabase } from "@/integrations/supabase/client";
import type { FamilyMember, FamilyMemberInput } from "./types";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = supabase as any;

export async function listFamilyMembers(
  citizenProfileId: string,
): Promise<FamilyMember[]> {
  const { data, error } = await db
    .from("family_members")
    .select("*")
    .eq("citizen_profile_id", citizenProfileId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as FamilyMember[];
}

export async function createFamilyMember(
  citizenProfileId: string,
  input: FamilyMemberInput,
): Promise<FamilyMember> {
  const { data, error } = await db
    .from("family_members")
    .insert({ ...input, citizen_profile_id: citizenProfileId })
    .select()
    .single();
  if (error) throw error;
  return data as FamilyMember;
}

export async function updateFamilyMember(
  id: string,
  input: FamilyMemberInput,
): Promise<FamilyMember> {
  const { data, error } = await db
    .from("family_members")
    .update(input)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data as FamilyMember;
}

export async function deleteFamilyMember(id: string): Promise<void> {
  const { error } = await db.from("family_members").delete().eq("id", id);
  if (error) throw error;
}
