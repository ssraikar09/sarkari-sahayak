import type { GovernmentScheme } from "@/lib/schemes";
import type { LinkStatus, ResolvedLink } from "./linkResolver";

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
  /** Primary CTA — direct scheme link OR department-level fallback. */
  officialSchemeLink: string | null;
  /** Secondary CTA — application portal when distinct from primary. */
  officialPortalLink: string | null;
  /** Resolution status of the official resource. */
  linkStatus: LinkStatus;
  /** Full resolution metadata for richer UI. */
  resolvedPrimary: ResolvedLink;
  resolvedApply: ResolvedLink | null;
  hasDetailedGuidance: boolean;
};
