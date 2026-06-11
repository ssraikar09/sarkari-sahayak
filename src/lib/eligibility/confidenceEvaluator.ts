import type { ConfidenceLabel } from "./types";

export function getConfidence(matchedCount: number): ConfidenceLabel {
  if (matchedCount >= 4) return "High Match";
  if (matchedCount >= 2) return "Medium Match";
  return "Low Match";
}

export function getConfidenceTone(
  label: ConfidenceLabel,
): "success" | "warning" | "muted" {
  if (label === "High Match") return "success";
  if (label === "Medium Match") return "warning";
  return "muted";
}
