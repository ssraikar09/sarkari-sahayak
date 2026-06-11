import type { AssistantSource, RetrievedScheme } from "./types";

export function toAssistantSources(
  retrieved: RetrievedScheme[],
): AssistantSource[] {
  return retrieved.map((r) => ({
    id: r.scheme.id,
    scheme_name: r.scheme.scheme_name,
    official_link: r.scheme.official_link,
    scheme_scope: r.scheme.scheme_scope,
    state: r.scheme.state,
  }));
}

export const TRUST_FALLBACK_MESSAGE =
  "We could not locate verified information related to your query within Sarkari Sahayak's knowledge base.";
