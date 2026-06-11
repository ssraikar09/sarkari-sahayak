import type { FamilyMember, FamilyMemberInput } from "./types";
import {
  createFamilyMemberFn,
  deleteFamilyMemberFn,
  listFamilyMembersFn,
  updateFamilyMemberFn,
} from "./family.functions";

export async function listFamilyMembers(
  citizenProfileId: string,
): Promise<FamilyMember[]> {
  return (await listFamilyMembersFn({
    data: { citizen_profile_id: citizenProfileId },
  })) as FamilyMember[];
}

export async function createFamilyMember(
  citizenProfileId: string,
  input: FamilyMemberInput,
): Promise<FamilyMember> {
  return (await createFamilyMemberFn({
    data: { citizen_profile_id: citizenProfileId, input },
  })) as FamilyMember;
}

export async function updateFamilyMember(
  id: string,
  input: FamilyMemberInput,
  citizenProfileId: string,
): Promise<FamilyMember> {
  return (await updateFamilyMemberFn({
    data: { id, citizen_profile_id: citizenProfileId, input },
  })) as FamilyMember;
}

export async function deleteFamilyMember(
  id: string,
  citizenProfileId: string,
): Promise<void> {
  await deleteFamilyMemberFn({
    data: { id, citizen_profile_id: citizenProfileId },
  });
}
