export const STATES = [
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
] as const;

export const GENDERS = ["Male", "Female", "Other", "Prefer not to say"] as const;

export const OCCUPATIONS = [
  "Farmer",
  "Student",
  "Homemaker",
  "Worker",
  "Entrepreneur",
  "Senior Citizen",
  "Other",
] as const;

export const INCOME_BRACKETS = [
  "Less than ₹1 lakh",
  "₹1–3 lakh",
  "₹3–5 lakh",
  "Above ₹5 lakh",
] as const;

export const EDUCATION_LEVELS = [
  "No formal education",
  "Primary",
  "Secondary",
  "Higher Secondary",
  "Diploma",
  "Graduate",
  "Post Graduate",
] as const;

export const LANGUAGES = ["English", "Hindi", "Kannada", "Marathi", "Tamil"] as const;

export type CitizenProfileInput = {
  full_name: string;
  age: number;
  gender: string;
  state: string;
  district: string;
  occupation: string;
  annual_income: string;
  education_level: string;
  disability_status: boolean;
  preferred_language: string;
  family_members: number;
};

export type CitizenProfile = CitizenProfileInput & {
  id: string;
  created_at: string;
};

export const PROFILE_STORAGE_KEY = "ssx_citizen_profile_id";
