import type { AssistantSource } from "@/lib/rag/types";

export type GoalCategory =
  | "Education"
  | "Entrepreneurship"
  | "Agriculture"
  | "Retirement"
  | "Healthcare"
  | "Women's Empowerment"
  | "Skill Development"
  | "General Welfare";

export type GoalClassification = {
  category: GoalCategory;
  confidence: number;
  matchedKeywords: string[];
};

export type ActionStepStatus = "not_started" | "in_progress" | "completed";

export type ActionStep = {
  id: string;
  title: string;
  description: string;
  /** Optional scheme reference, when the step is tied to a specific scheme. */
  schemeId?: string;
  schemeName?: string;
  /** Why this step was suggested. */
  rationale: string;
  /** Optional external link (e.g. official portal). */
  link?: string;
};

export type WelfareActionPlan = {
  goalText: string;
  classification: GoalClassification;
  steps: ActionStep[];
  sources: AssistantSource[];
  fallback: boolean;
  rationale: string[];
  generatedAt: string;
};

export type NavigatorRequest = {
  goalText: string;
  citizenProfileId?: string | null;
};

export type StoredProgress = Record<string, ActionStepStatus>;

export type SuggestedGoal = {
  label: string;
  prompt: string;
  category: GoalCategory;
};
