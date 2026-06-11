// Official government scheme resources used by the fallback system.
// Keep this file framework-agnostic so future modules (Hybrid RAG, Agentic
// CSC Assistant) can consume the same data.

export type OfficialResource = {
  name: string;
  url: string;
  description: string;
};

export const NATIONAL_RESOURCES: OfficialResource[] = [
  {
    name: "MyScheme Portal",
    url: "https://www.myscheme.gov.in/",
    description:
      "Government of India's official platform to discover schemes you may be eligible for.",
  },
  {
    name: "India.gov.in Schemes Directory",
    url: "https://www.india.gov.in/my-government/schemes-0",
    description:
      "Comprehensive directory of central government schemes across all ministries.",
  },
];

export const STATE_RESOURCES: Record<string, OfficialResource> = {
  Karnataka: {
    name: "Karnataka Government Portal",
    url: "https://www.karnataka.gov.in/",
    description: "Official portal of the Government of Karnataka.",
  },
  Maharashtra: {
    name: "Maharashtra Government Portal",
    url: "https://www.maharashtra.gov.in/",
    description: "Official portal of the Government of Maharashtra.",
  },
  "Tamil Nadu": {
    name: "Tamil Nadu Government Portal",
    url: "https://www.tn.gov.in/",
    description: "Official portal of the Government of Tamil Nadu.",
  },
  Telangana: {
    name: "Telangana Government Portal",
    url: "https://www.telangana.gov.in/",
    description: "Official portal of the Government of Telangana.",
  },
  "Uttar Pradesh": {
    name: "Uttar Pradesh Government Portal",
    url: "https://up.gov.in/",
    description: "Official portal of the Government of Uttar Pradesh.",
  },
};

export function getStateResource(state?: string | null): OfficialResource | null {
  if (!state) return null;
  return STATE_RESOURCES[state] ?? null;
}
