import type { SchemeGuidance } from "./types";

export function buildSummaryText(g: SchemeGuidance): string {
  const s = g.scheme;
  const lines: string[] = [];
  lines.push(`SARKARI SAHAYAK X — APPLICATION SUMMARY`);
  lines.push(`=========================================`);
  lines.push("");
  lines.push(`Scheme Name: ${s.scheme_name}`);
  lines.push(`Category: ${s.category}`);
  lines.push(`Scope: ${s.scheme_scope}${s.scheme_scope === "State" ? ` (${s.state})` : ""}`);
  lines.push(`Application Mode: ${g.mode}`);
  lines.push(`Estimated Processing Time: ${g.estimatedProcessingTime}`);
  lines.push(`Last Updated: ${g.lastUpdated}`);
  lines.push("");
  lines.push(`DESCRIPTION`);
  lines.push(`-----------`);
  lines.push(s.description);
  lines.push("");
  lines.push(`REQUIRED DOCUMENTS`);
  lines.push(`------------------`);
  if (g.documents.length === 0) {
    lines.push("(See official portal for the latest document list.)");
  } else {
    g.documents.forEach((d) => lines.push(`[ ] ${d.label}`));
  }
  lines.push("");
  lines.push(`STEP-BY-STEP GUIDANCE`);
  lines.push(`---------------------`);
  g.steps.forEach((step) => {
    lines.push(`Step ${step.index}: ${step.title}`);
    if (step.detail) lines.push(`    ${step.detail}`);
  });
  lines.push("");
  lines.push(`OFFICIAL LINKS`);
  lines.push(`--------------`);
  lines.push(`Scheme link: ${g.officialSchemeLink ?? "(not available)"}`);
  if (g.officialPortalLink && g.officialPortalLink !== g.officialSchemeLink) {
    lines.push(`Application portal: ${g.officialPortalLink}`);
  }
  lines.push("");
  lines.push(`Generated on ${new Date().toLocaleString()} by Sarkari Sahayak X.`);
  return lines.join("\n");
}

export function downloadSummary(g: SchemeGuidance): void {
  if (typeof window === "undefined") return;
  const text = buildSummaryText(g);
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `application-summary-${g.scheme.scheme_name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .slice(0, 60)}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
