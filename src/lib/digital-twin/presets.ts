import type { LeverMeta, Levers, ScenarioPreset } from "./types";

export const LEVERS: LeverMeta[] = [
  {
    id: "awareness",
    label: "Welfare awareness increase",
    short: "Awareness",
    description:
      "Citizens learning about schemes they qualify for through assistant queries and search.",
    weight: 0.28,
    module: "Assistant queries · Scheme search logs",
  },
  {
    id: "csc",
    label: "CSC outreach expansion",
    short: "CSC outreach",
    description:
      "Field-agent outreach (CSC Dashboard) drives last-mile enrolment for high-risk households.",
    weight: 0.24,
    module: "CSC Dashboard analytics",
  },
  {
    id: "documentation",
    label: "Documentation readiness",
    short: "Documentation",
    description:
      "Application Guide checklists remove the most common drop-off cause: missing documents.",
    weight: 0.18,
    module: "Application Guide usage",
  },
  {
    id: "navigatorAdoption",
    label: "Navigator adoption increase",
    short: "Navigator",
    description:
      "More citizens use guided welfare plans (Welfare Navigator), closing curated gaps.",
    weight: 0.18,
    module: "Navigator usage logs",
  },
  {
    id: "completion",
    label: "Application completion improvement",
    short: "Completion",
    description:
      "Fewer abandoned applications — improved follow-through on recommended schemes.",
    weight: 0.12,
    module: "Eligibility assessments",
  },
];

export const ZERO_LEVERS: Levers = {
  awareness: 0,
  csc: 0,
  documentation: 0,
  navigatorAdoption: 0,
  completion: 0,
};

export const SCENARIO_PRESETS: ScenarioPreset[] = [
  {
    id: "csc-coverage",
    label: "Increase CSC coverage",
    description:
      "Field outreach push — bring assisted enrolment to under-served districts.",
    levers: {
      awareness: 30,
      csc: 70,
      documentation: 25,
      navigatorAdoption: 20,
      completion: 25,
    },
  },
  {
    id: "docs-support",
    label: "Improve documentation support",
    description:
      "Application-guide led drive to close documentation gaps blocking eligibility.",
    levers: {
      awareness: 25,
      csc: 30,
      documentation: 75,
      navigatorAdoption: 25,
      completion: 40,
    },
  },
  {
    id: "awareness-boost",
    label: "Boost citizen awareness",
    description:
      "Communications-first scenario: more citizens reach the platform and discover entitlements.",
    levers: {
      awareness: 80,
      csc: 25,
      documentation: 25,
      navigatorAdoption: 45,
      completion: 25,
    },
  },
  {
    id: "digital-adoption",
    label: "Digital adoption push",
    description:
      "Drive self-serve usage — Navigator plans and assistant guidance carry the workload.",
    levers: {
      awareness: 45,
      csc: 25,
      documentation: 30,
      navigatorAdoption: 75,
      completion: 55,
    },
  },
  {
    id: "full-optimization",
    label: "Full ecosystem optimisation",
    description:
      "All five levers move together — the policymaker's upper-bound scenario.",
    levers: {
      awareness: 70,
      csc: 70,
      documentation: 70,
      navigatorAdoption: 70,
      completion: 70,
    },
  },
];
