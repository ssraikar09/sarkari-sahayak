import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { LifeEventId, LifeStage } from "./types";

export const LIFE_EVENTS: { id: LifeEventId; label: string; description: string }[] = [
  { id: "business", label: "Start a Business", description: "Pursue entrepreneurship & MSME schemes" },
  { id: "higher_education", label: "Higher Education", description: "Pursue advanced studies & scholarships" },
  { id: "marriage", label: "Marriage", description: "Plan household & family welfare" },
  { id: "retirement", label: "Retirement", description: "Plan pension & retirement security" },
  { id: "senior_citizen", label: "Senior Citizen", description: "Access elder welfare & health protection" },
];

export function lifeStageFor(age: number): LifeStage {
  if (age < 14) return "Child";
  if (age < 22) return "Student";
  if (age < 30) return "Young Adult";
  if (age < 45) return "Working Age";
  if (age < 55) return "Mid-Career";
  if (age < 60) return "Pre-Retirement";
  return "Senior Citizen";
}

/**
 * Returns a modified profile reflecting the simulated life event.
 * Does not mutate the original.
 */
export function applyLifeEvent(
  profile: CitizenProfile,
  event: LifeEventId | null,
): CitizenProfile {
  if (!event) return profile;
  const next: CitizenProfile = { ...profile };
  switch (event) {
    case "business":
      next.occupation = "Self-employed / Entrepreneur";
      break;
    case "higher_education":
      next.occupation = "Student";
      next.education_level = "Postgraduate";
      break;
    case "marriage":
      next.family_members = Math.max(profile.family_members, 2) + 1;
      break;
    case "retirement":
      next.occupation = "Retired";
      next.age = Math.max(profile.age, 60);
      break;
    case "senior_citizen":
      next.age = Math.max(profile.age, 65);
      next.occupation = "Retired";
      break;
  }
  return next;
}

export function eventCategoryWeights(event: LifeEventId | null): Record<string, number> {
  if (!event) return {};
  switch (event) {
    case "business":
      return { Entrepreneurship: 3, Employment: 2, "Skill Development": 2 };
    case "higher_education":
      return { Education: 3, Scholarship: 3, "Skill Development": 2 };
    case "marriage":
      return { Housing: 2, "Women & Child": 2, Healthcare: 2 };
    case "retirement":
      return { Pension: 3, "Social Security": 3, Healthcare: 2 };
    case "senior_citizen":
      return { Pension: 3, Healthcare: 3, "Social Security": 2 };
  }
}
