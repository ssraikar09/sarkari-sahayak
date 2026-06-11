import { z } from "zod";
import {
  STATES,
  GENDERS,
  OCCUPATIONS,
  INCOME_BRACKETS,
  EDUCATION_LEVELS,
  LANGUAGES,
} from "./constants";

export const citizenProfileSchema = z.object({
  full_name: z.string().trim().min(2, "Please enter your full name").max(100),
  age: z.coerce.number().int().min(1, "Enter a valid age").max(120),
  gender: z.enum(GENDERS as unknown as [string, ...string[]]),
  state: z.enum(STATES as unknown as [string, ...string[]]),
  district: z.string().trim().min(2, "Enter your district").max(80),
  occupation: z.enum(OCCUPATIONS as unknown as [string, ...string[]]),
  annual_income: z.enum(INCOME_BRACKETS as unknown as [string, ...string[]]),
  education_level: z.enum(EDUCATION_LEVELS as unknown as [string, ...string[]]),
  disability_status: z.boolean(),
  preferred_language: z.enum(LANGUAGES as unknown as [string, ...string[]]),
  family_members: z.coerce.number().int().min(1, "At least 1").max(30),
});

export type CitizenProfileFormValues = z.infer<typeof citizenProfileSchema>;
