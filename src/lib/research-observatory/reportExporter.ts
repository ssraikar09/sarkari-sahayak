import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { ResearchSnapshot } from "./types";

export type ReportKind = "executive" | "policy-brief" | "research-insight";

const TITLES: Record<ReportKind, string> = {
  executive: "Executive Summary — Welfare Research Observatory",
  "policy-brief": "Policy Brief — Welfare Research Observatory",
  "research-insight": "Research Insight Report — Welfare Research Observatory",
};

export function exportObservatoryReport(kind: ReportKind, snap: ResearchSnapshot): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  } as CSSStyleDeclaration);
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = TITLES[kind];
  document.body.appendChild(iframe);

  const html = buildHtml(kind, snap);
  const triggerPrint = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch (err) {
      console.warn("Print failed", err);
    }
    setTimeout(() => iframe.parentNode?.removeChild(iframe), 1500);
  };
  iframe.onload = () => setTimeout(triggerPrint, 250);
  if ("srcdoc" in iframe) iframe.srcdoc = html;
  else {
    const doc = (iframe as HTMLIFrameElement).contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${value}</td></tr>`;
}

function buildHtml(kind: ReportKind, snap: ResearchSnapshot): string {
  const { metrics, trends, archetypes, findings } = snap;
  const showFullFindings = kind !== "executive";
  const showArchetypes = kind !== "executive";
  const showTrends = true;

  const findingItems = findings
    .map(
      (f) =>
        `<li style="margin:8px 0"><strong>${escapeHtml(f.title)}</strong>${showFullFindings ? `<div style="color:#444;margin-top:2px">${escapeHtml(f.narrative)}</div><div style="color:#666;font-size:11px;margin-top:2px">Modules: ${f.contributingModules.map(escapeHtml).join(", ")} · Datasets: ${f.datasets.map(escapeHtml).join(", ")}</div>` : ""}</li>`,
    )
    .join("");

  const archetypeRows = archetypes
    .map(
      (a) =>
        `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(a.name)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${a.households}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right">${formatINR(a.potentialBenefitPoolINR)}</td></tr>`,
    )
    .join("");

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>${escapeHtml(TITLES[kind])}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:14px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px;text-transform:uppercase;letter-spacing:.08em;color:#333}
  .muted{color:#666;font-size:12px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
  table{width:100%;border-collapse:collapse;font-size:13px}
</style></head><body>
<h1>${escapeHtml(TITLES[kind])}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">All metrics derived deterministically from anonymized platform analytics (Modules 1–19). No synthetic data.</div>

<h2>Research Snapshot</h2>
<table>
  ${row("Households studied", String(metrics.householdsStudied))}
  ${row("Schemes analyzed", String(metrics.schemesAnalyzed))}
  ${row("Goal categories covered", String(metrics.goalCategoriesCovered))}
  ${row("High-risk share", `${metrics.highRiskSharePercent}%`)}
  ${row("Average opportunity score", `${metrics.averageOpportunityScore} / 100`)}
  ${row("Average projected benefit", formatINR(metrics.averageProjectedBenefitINR))}
</table>

<h2>Key Findings</h2>
${findingItems ? `<ul style="margin:0;padding-left:18px">${findingItems}</ul>` : `<p class="muted">No findings yet.</p>`}

${
  showTrends
    ? `<h2>Welfare Trend Observatory</h2>
<div><strong>Missed opportunities by category</strong></div>
<table>${trends.missedByCategory.map((c) => row(c.category, `${c.count} (${c.percent}%)`)).join("")}</table>
<div style="margin-top:10px"><strong>Benefit concentration</strong></div>
<table>${trends.benefitConcentration.map((c) => row(c.label, `${formatINR(c.value)} · ${Math.round(c.share * 100)}%`)).join("")}</table>
<div style="margin-top:10px"><strong>Risk concentration</strong></div>
<table>${trends.riskConcentration.map((c) => row(c.label, `${c.value} households · ${Math.round(c.share * 100)}%`)).join("")}</table>`
    : ""
}

${
  showArchetypes
    ? `<h2>Household Archetypes</h2>
<table>
  <thead><tr><th style="text-align:left;padding:6px 12px;border-bottom:2px solid #333">Archetype</th><th style="text-align:right;padding:6px 12px;border-bottom:2px solid #333">Households</th><th style="text-align:right;padding:6px 12px;border-bottom:2px solid #333">Benefit pool</th></tr></thead>
  <tbody>${archetypeRows}</tbody>
</table>`
    : ""
}
</body></html>`;
}
