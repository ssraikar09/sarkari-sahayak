import type { FamilyMember } from "./types";

/**
 * Convert a family member to a CitizenProfile-shaped object so the existing
 * eligibility engine (which is typed against CitizenProfile) can score it
 * without modification. Anchors household geography to the head of family's
 * state/district/language/family_members count.
 */
export function familyMemberToProfileShape(
  member: FamilyMember,
  anchor: {
    id: string;
    state: string;
    district: string;
    preferred_language: string;
    family_members: number;
    created_at: string;
  },
) {
  return {
    id: member.id,
    full_name: member.full_name,
    age: member.age,
    gender: member.gender,
    state: anchor.state,
    district: anchor.district,
    occupation: member.occupation,
    annual_income: member.annual_income,
    education_level: member.education_level,
    disability_status: member.disability_status,
    preferred_language: anchor.preferred_language,
    family_members: anchor.family_members,
    created_at: member.created_at,
  };
}

/**
 * Friendly grouping label used in the dashboard ("Father", "Mother",
 * "Children", "Senior Citizens").
 */
export function groupLabelForMember(member: FamilyMember): string {
  if (member.age >= 60) return "Senior Citizens";
  if (["Son", "Daughter"].includes(member.relationship)) return "Children";
  return member.relationship;
}
