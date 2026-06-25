import type { GovernmentScheme } from "@/lib/schemes";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import type { VoiceLanguageCode } from "@/lib/voice/languageConfig";

export type AssistantIntent =
  | "eligibility"
  | "documents"
  | "benefits"
  | "comparison"
  | "discovery"
  | "general";

export type RetrievedScheme = {
  scheme: GovernmentScheme;
  score: number;
  matchedTerms: string[];
};

export type AssistantSource = {
  id: string;
  scheme_name: string;
  official_link: string | null;
  scheme_scope: string;
  state: string;
};

export type AssistantMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: AssistantSource[];
  /** Marks a deterministic trust-layer reply (no model call). */
  fallback?: boolean;
  createdAt: string;
};

export type AssistantRequest = {
  query: string;
  citizenProfileId?: string | null;
  targetLanguage?: VoiceLanguageCode;
};

export type AssistantResponse = {
  answer: string;
  sources: AssistantSource[];
  intent: AssistantIntent;
  fallback: boolean;
  retrievedSchemeIds: string[];
};

export type AssistantContext = {
  query: string;
  originalQuery: string;
  responseLanguage: string;
  intent: AssistantIntent;
  profile: CitizenProfile | null;
  retrieved: RetrievedScheme[];
};
