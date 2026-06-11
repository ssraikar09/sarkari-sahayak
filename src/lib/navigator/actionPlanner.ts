import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { GovernmentScheme } from "@/lib/schemes";
import type { ActionStep, GoalClassification } from "./types";

function makeId(prefix: string, idx: number): string {
  return `${prefix}-${idx}`;
}

/**
 * Build a deterministic, explainable welfare action plan from a goal
 * classification, retrieved verified schemes, and optional citizen profile.
 */
export function buildActionPlan(
  classification: GoalClassification,
  schemes: GovernmentScheme[],
  profile: CitizenProfile | null,
): ActionStep[] {
  const steps: ActionStep[] = [];
  const primary = schemes[0];

  // Step 1: Explore the top verified scheme.
  if (primary) {
    steps.push({
      id: makeId("step", 1),
      title: `Explore ${primary.scheme_name}`,
      description: primary.description.slice(0, 200),
      schemeId: primary.id,
      schemeName: primary.scheme_name,
      rationale: `Top verified match for your "${classification.category}" goal from Sarkari Sahayak's knowledge base.`,
      link: primary.official_link ?? undefined,
    });
  } else {
    steps.push({
      id: makeId("step", 1),
      title: "Browse related schemes",
      description: `No exact verified schemes matched. Browse the ${classification.category} category to discover related options.`,
      rationale: "Trust layer: no verified scheme matched your goal text directly.",
    });
  }

  // Step 2: Prepare core documents.
  const docList = primary?.required_documents
    ? primary.required_documents.split(/[,;\n]/).map((s) => s.trim()).filter(Boolean).slice(0, 5)
    : ["Aadhaar", "PAN", "Proof of address", "Recent photograph"];
  steps.push({
    id: makeId("step", 2),
    title: "Prepare your documents",
    description: `Keep these ready: ${docList.join(", ")}.`,
    schemeId: primary?.id,
    schemeName: primary?.scheme_name,
    rationale: primary
      ? "Documents listed are those officially required for this scheme."
      : "Standard identity & address proofs required by most welfare schemes.",
  });

  // Step 3: Review eligibility.
  steps.push({
    id: makeId("step", 3),
    title: "Review eligibility requirements",
    description: primary?.eligibility_criteria
      ? primary.eligibility_criteria.slice(0, 220)
      : "Use the Eligibility Checker to confirm which schemes fit your profile.",
    schemeId: primary?.id,
    schemeName: primary?.scheme_name,
    rationale: profile
      ? `Personalized to your profile (${profile.occupation}, ${profile.state}, age ${profile.age}).`
      : "Complete a citizen profile to personalize this step further.",
  });

  // Step 4: Download summary / guide.
  steps.push({
    id: makeId("step", 4),
    title: "Download the application summary",
    description: "Use the Application Guide to generate a printable checklist and step-by-step guidance.",
    schemeId: primary?.id,
    schemeName: primary?.scheme_name,
    rationale: "Reuses the Module 6 Application Guide to give you offline-friendly instructions.",
  });

  // Step 5: Visit official portal / second scheme.
  const second = schemes[1];
  if (primary?.official_link) {
    steps.push({
      id: makeId("step", 5),
      title: "Visit the official portal to apply",
      description: `Submit your application on the verified government portal for ${primary.scheme_name}.`,
      schemeId: primary.id,
      schemeName: primary.scheme_name,
      rationale: "Only official portals are recommended to preserve the trust layer.",
      link: primary.official_link,
    });
  } else if (second) {
    steps.push({
      id: makeId("step", 5),
      title: `Also consider ${second.scheme_name}`,
      description: second.description.slice(0, 200),
      schemeId: second.id,
      schemeName: second.scheme_name,
      rationale: "Second verified match for your goal — broadens your welfare coverage.",
      link: second.official_link ?? undefined,
    });
  } else {
    steps.push({
      id: makeId("step", 5),
      title: "Talk to the AI Assistant for follow-ups",
      description: "Open the AI Welfare Assistant to ask clarifying questions about this plan.",
      rationale: "The assistant uses the same verified knowledge base as this navigator.",
    });
  }

  return steps;
}

export function buildPlanRationale(
  classification: GoalClassification,
  schemes: GovernmentScheme[],
  profile: CitizenProfile | null,
): string[] {
  const out: string[] = [];
  out.push(
    classification.category === "General Welfare"
      ? "Could not confidently classify your goal — showing general welfare guidance."
      : `Matches your "${classification.category}" life goal.`,
  );
  if (profile) {
    out.push(
      `Aligned with your citizen profile (${profile.occupation}, ${profile.state}).`,
    );
  } else {
    out.push("Create a citizen profile to personalize this plan further.");
  }
  if (schemes.length > 0) {
    out.push(
      `${schemes.length} verified scheme${schemes.length > 1 ? "s" : ""} identified from Sarkari Sahayak's knowledge base.`,
    );
  } else {
    out.push("No verified schemes matched — trust layer fallback applied.");
  }
  return out;
}
