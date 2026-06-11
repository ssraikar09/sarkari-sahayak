import type { GovernmentScheme } from "@/lib/schemes";
import type { FamilyMember } from "@/lib/family-planner";
import type { GoalCategory } from "@/lib/navigator/types";

export type GraphNodeKind =
  | "citizen"
  | "member"
  | "scheme"
  | "goal"
  | "guide"
  | "evidence";

export type GraphNode = {
  id: string;
  kind: GraphNodeKind;
  label: string;
  sublabel?: string;
  meta?: Record<string, string | number>;
};

export type GraphEdge = {
  id: string;
  from: string;
  to: string;
  label?: string;
};

export type HouseholdMemberSummary = {
  memberId: string;
  name: string;
  relationship: string;
  opportunityScore: number;
  eligibleCount: number;
  missedCount: number;
  estimatedAnnualBenefitINR: number;
  riskCategory: "High" | "Moderate" | "Low";
};

export type SchemeRelationship = {
  schemeId: string;
  schemeName: string;
  category: string;
  scope: "National" | "State" | string;
  relatedMemberIds: string[];
  confidence: number; // 0-100
  evidenceCount: number;
  goalCategories: GoalCategory[];
};

export type GoalConnection = {
  category: GoalCategory;
  schemeIds: string[];
  memberIds: string[];
};

export type ResearchInsights = {
  mostConnectedCategories: { category: string; count: number }[];
  topMissedHouseholds: { memberName: string; missed: number }[];
  avgSchemesPerMember: number;
  avgBenefitsPerMemberINR: number;
};

export type HouseholdKnowledgeGraph = {
  generatedAt: string;
  citizenLabel: string;
  members: HouseholdMemberSummary[];
  schemes: SchemeRelationship[];
  goals: GoalConnection[];
  nodes: GraphNode[];
  edges: GraphEdge[];
  insights: ResearchInsights;
};

export type GraphInputs = {
  citizenName: string;
  citizenId: string;
  members: FamilyMember[];
  schemeCatalogue: GovernmentScheme[];
};
