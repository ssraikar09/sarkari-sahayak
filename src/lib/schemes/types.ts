export const SCHEME_STATES = [
  "Karnataka",
  "Maharashtra",
  "Tamil Nadu",
  "Telangana",
  "Uttar Pradesh",
] as const;

export const SCHEME_CATEGORIES = [
  "Farmers",
  "Women",
  "Students",
  "Senior Citizens",
  "Entrepreneurs",
] as const;

export type SchemeState = (typeof SCHEME_STATES)[number];
export type SchemeCategory = (typeof SCHEME_CATEGORIES)[number];

export type GovernmentScheme = {
  id: string;
  scheme_name: string;
  state: string;
  category: string;
  description: string;
  eligibility_criteria: string;
  benefits: string;
  required_documents: string;
  official_link: string | null;
  last_updated: string;
  created_at: string;
};

export type SchemeFilters = {
  search?: string;
  state?: string;
  category?: string;
};
