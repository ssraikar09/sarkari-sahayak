import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type { FamilyMember } from "@/lib/family-planner";

export type LifeEventId =
  | "business"
  | "higher_education"
  | "marriage"
  | "retirement"
  | "senior_citizen";

export type LifeStage =
  | "Child"
  | "Student"
  | "Young Adult"
  | "Working Age"
  | "Mid-Career"
  | "Pre-Retirement"
  | "Senior Citizen";

export type RoadmapYear = {
  year: number;
  age: number;
  stage: LifeStage;
  focus: string; // e.g. "Education Support"
  categories: string[];
  schemes: GovernmentScheme[];
  expectedOutcome: string;
  rationale: string[]; // why-this-recommended bullets
};

export type MemberFuturePlan = {
  member: FamilyMember | null; // null = anchor citizen
  displayName: string;
  age: number;
  stage: LifeStage;
  predictedNeeds: string[];
  futureSchemes: GovernmentScheme[];
  estimatedAnnualBenefit: number; // INR
};

export type ForecastItem = {
  scheme: GovernmentScheme;
  yearsAway: number;
  reason: string;
};

export type Roadmap = {
  profile: CitizenProfile;
  years: RoadmapYear[];
  household: MemberFuturePlan[];
  upcoming: ForecastItem[];
  missed: ForecastItem[];
  longTermBenefit: number;
  journeyScore: number;
  journeyBand: "Vulnerable" | "Developing" | "Welfare Ready";
  appliedEvent: LifeEventId | null;
  generatedAt: string;
};
