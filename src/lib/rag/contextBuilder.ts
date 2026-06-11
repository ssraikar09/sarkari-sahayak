import type { AssistantContext, AssistantIntent, RetrievedScheme } from "./types";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";

export function buildSystemPrompt(): string {
  return [
    "You are Sarkari Sahayak X, a trustworthy AI assistant that helps Indian citizens understand government welfare schemes.",
    "Answer ONLY using the verified scheme information provided in the context below.",
    "Never invent scheme names, eligibility rules, benefit amounts, application steps, or links.",
    "If the context does not contain enough information to answer, say so clearly and recommend browsing schemes or visiting official sources.",
    "Cite scheme names inline like (Source: <Scheme Name>) when you reference specific facts.",
    "Use short paragraphs, simple language, and bullet lists where helpful. Reply in the user's language when possible.",
    "Do not provide legal, medical, or financial advice beyond what the verified context states.",
  ].join("\n");
}

export function buildUserPrompt(ctx: AssistantContext): string {
  const profilePart = ctx.profile ? renderProfile(ctx.profile) : "No citizen profile available.";
  const schemesPart = ctx.retrieved.length
    ? ctx.retrieved.map((r, i) => renderScheme(r, i + 1)).join("\n\n")
    : "No verified schemes retrieved.";

  return [
    `Detected intent: ${ctx.intent}`,
    "",
    "## Citizen profile",
    profilePart,
    "",
    "## Verified schemes from Sarkari Sahayak knowledge base",
    schemesPart,
    "",
    "## User question",
    ctx.query,
    "",
    "Respond using only the verified schemes above. Mention the schemes you used.",
  ].join("\n");
}

function renderProfile(p: CitizenProfile): string {
  return [
    `- Name: ${p.full_name}`,
    `- Age: ${p.age}`,
    `- Gender: ${p.gender}`,
    `- State: ${p.state}, District: ${p.district}`,
    `- Occupation: ${p.occupation}`,
    `- Annual income: ${p.annual_income}`,
    `- Education: ${p.education_level}`,
    `- Disability: ${p.disability_status ? "Yes" : "No"}`,
    `- Family members: ${p.family_members}`,
  ].join("\n");
}

function renderScheme(r: RetrievedScheme, idx: number): string {
  const s = r.scheme;
  return [
    `### ${idx}. ${s.scheme_name}`,
    `- Scope: ${s.scheme_scope}${s.scheme_scope === "State" ? ` (${s.state})` : ""}`,
    `- Category: ${s.category}`,
    `- Description: ${s.description}`,
    `- Eligibility: ${s.eligibility_criteria}`,
    `- Benefits: ${s.benefits}`,
    `- Documents: ${s.required_documents}`,
    s.application_process ? `- How to apply: ${s.application_process}` : null,
    s.official_link ? `- Official link: ${s.official_link}` : null,
  ]
    .filter(Boolean)
    .join("\n");
}

export function buildContext(
  query: string,
  intent: AssistantIntent,
  profile: CitizenProfile | null,
  retrieved: RetrievedScheme[],
): AssistantContext {
  return { query, intent, profile, retrieved };
}
