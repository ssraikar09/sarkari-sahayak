import { getSchemeById } from "@/lib/schemes";
import type { GovernmentScheme } from "@/lib/schemes";
import type {
  ApplicationMode,
  ApplicationStep,
  DocumentChecklistItem,
  SchemeGuidance,
} from "./types";

const ONLINE_HINTS = ["online", "portal", "website", "https://", "http://"];
const OFFLINE_HINTS = ["offline", "csc", "common service centre", "bank branch", "office", "in person"];

function detectMode(scheme: GovernmentScheme): ApplicationMode {
  const text = `${scheme.application_process ?? ""} ${scheme.description}`.toLowerCase();
  const link = (scheme.official_link ?? "").toLowerCase();
  const hasOnline =
    ONLINE_HINTS.some((h) => text.includes(h)) || link.startsWith("http");
  const hasOffline = OFFLINE_HINTS.some((h) => text.includes(h));
  if (hasOnline && hasOffline) return "Both";
  if (hasOnline) return "Online";
  if (hasOffline) return "Offline";
  return "Unknown";
}

function deriveSteps(scheme: GovernmentScheme): ApplicationStep[] {
  const fromScheme = (scheme.application_process ?? "")
    .split(/\r?\n|(?:\d+[.)])\s+|;\s+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 4);

  if (fromScheme.length >= 2) {
    return fromScheme.slice(0, 8).map((title, i) => ({ index: i + 1, title }));
  }

  // Fallback canonical timeline
  const portal = scheme.official_link ?? "the official government portal";
  return [
    {
      index: 1,
      title: "Verify eligibility",
      detail: `Review the eligibility criteria for ${scheme.scheme_name} to confirm you qualify.`,
    },
    {
      index: 2,
      title: "Collect all required documents",
      detail: "Gather the documents listed in the checklist below before you start.",
    },
    {
      index: 3,
      title: "Visit the official portal or nearest CSC",
      detail: `Go to ${portal} or your nearest Common Service Centre (CSC) to begin the application.`,
    },
    {
      index: 4,
      title: "Complete and submit the application",
      detail: "Fill in your details accurately, upload documents, and submit the form.",
    },
    {
      index: 5,
      title: "Track the application status",
      detail: "Save your acknowledgement number and check status periodically on the official portal.",
    },
  ];
}

function deriveDocuments(scheme: GovernmentScheme): DocumentChecklistItem[] {
  const raw = scheme.required_documents ?? "";
  const tokens = raw
    .split(/[,;\n]|\s\/\s/)
    .map((s) => s.replace(/^[\-\u2022\s]+/, "").trim())
    .filter((s) => s.length > 1 && s.length < 120);

  const dedup = Array.from(new Set(tokens.map((t) => t.replace(/\s+/g, " "))));
  return dedup.map((label, i) => ({
    id: `${i}-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40)}`,
    label,
  }));
}

function estimateProcessingTime(scheme: GovernmentScheme): string {
  const text = (scheme.important_dates ?? "").toLowerCase();
  const match = text.match(/(\d+)\s*(day|week|month)s?/);
  if (match) return `${match[1]} ${match[2]}${Number(match[1]) === 1 ? "" : "s"}`;
  return "Typically 2–6 weeks after submission";
}

export function buildGuidance(scheme: GovernmentScheme): SchemeGuidance {
  const steps = deriveSteps(scheme);
  const documents = deriveDocuments(scheme);
  return {
    scheme,
    mode: detectMode(scheme),
    estimatedProcessingTime: estimateProcessingTime(scheme),
    lastUpdated: scheme.last_updated,
    steps,
    documents,
    officialSchemeLink: scheme.official_link,
    officialPortalLink: scheme.official_link,
    hasDetailedGuidance: documents.length > 0 && steps.length > 0,
  };
}

export async function fetchGuidance(schemeId: string): Promise<SchemeGuidance | null> {
  const scheme = await getSchemeById(schemeId);
  if (!scheme) return null;
  return buildGuidance(scheme);
}
