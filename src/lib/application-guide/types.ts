import type { GovernmentScheme } from "@/lib/schemes";

export type ApplicationMode = "Online" | "Offline" | "Both" | "Unknown";

export type ApplicationStep = {
  index: number;
  title: string;
  detail?: string;
};

export type DocumentChecklistItem = {
  id: string;
  label: string;
};

export type SchemeGuidance = {
  scheme: GovernmentScheme;
  mode: ApplicationMode;
  estimatedProcessingTime: string;
  lastUpdated: string;
  steps: ApplicationStep[];
  documents: DocumentChecklistItem[];
  officialPortalLink: string | null;
  officialSchemeLink: string | null;
  hasDetailedGuidance: boolean;
};
