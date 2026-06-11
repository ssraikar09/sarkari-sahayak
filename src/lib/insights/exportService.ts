import type { InsightsSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import { generateInsightsSummary } from "./researchGenerator";

/**
 * Renders an anonymized welfare research report into a hidden iframe and
 * triggers the browser's native print-to-PDF dialog. Using an iframe (not
 * window.open) avoids popup blockers and the `noopener` null-reference issue
 * that was causing the export to appear empty.
 */
export function exportInsightsToPdf(snap: InsightsSnapshot): void {
  if (typeof window === "undefined") return;

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Welfare Research Report";
  document.body.appendChild(iframe);

  const html = buildHtml(snap);

  const triggerPrint = () => {
    const win = iframe.contentWindow;
    if (!win) return;
    try {
      win.focus();
      win.print();
    } catch (err) {
      console.warn("Print failed", err);
    }
    // Clean up after the print dialog has had a chance to open.
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };

  iframe.onload = () => {
    // Give styles/fonts a beat to settle before printing.
    setTimeout(triggerPrint, 250);
  };

  // Prefer srcdoc — same-origin and no document.write quirks.
  if ("srcdoc" in iframe) {
    iframe.srcdoc = html;
  } else {
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${label}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${value}</td></tr>`;
}

function list(items: { label: string; count: number }[]): string {
  if (!items.length) return `<p style="color:#777">No data yet.</p>`;
  return `<ol style="margin:0;padding-left:20px">${items
    .map((i) => `<li style="margin:4px 0">${escapeHtml(i.label)} <span style="color:#666">(${i.count})</span></li>`)
    .join("")}</ol>`;
}

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildHtml(snap: InsightsSnapshot): string {
  const { trends, household, utilization, risk } = snap;
  const summary = generateInsightsSummary(snap);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — Welfare Research Report</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:16px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
</style></head><body>
<h1>Sarkari Sahayak — Welfare Research Insights</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">All analytics are generated from anonymized user interactions and verified welfare recommendations.</div>

<h2>Household Welfare Statistics</h2>
<table>
  ${row("Households analyzed", String(household.profilesAnalyzed))}
  ${row("Average Opportunity Score", `${household.averageOpportunityScore} / 100`)}
  ${row("Average Missed Opportunities", String(household.averageMissedOpportunities))}
  ${row("Average Estimated Annual Benefits", formatINR(household.averageEstimatedAnnualBenefits))}
</table>

<h2>Insights Summary</h2>
${summary.length ? `<ul>${summary.map((l) => `<li>${escapeHtml(l)}</li>`).join("")}</ul>` : `<p style="color:#777">No insights available yet.</p>`}

<h2>Welfare Trends</h2>
<div class="grid">
  <div><strong>Most Searched Categories</strong>${list(trends.searchedCategories.map((c) => ({ label: c.category, count: c.count })))}</div>
  <div><strong>Most Recommended Categories</strong>${list(trends.recommendedCategories.map((c) => ({ label: c.category, count: c.count })))}</div>
  <div><strong>Most Explored Guides</strong>${list(trends.topGuides.map((s) => ({ label: s.name, count: s.count })))}</div>
  <div><strong>Most Used Navigator Goals</strong>${list(trends.navigatorGoals.map((g) => ({ label: g.goal, count: g.count })))}</div>
</div>

<h2>Scheme Utilization</h2>
<div class="grid">
  <div><strong>Top Viewed Schemes</strong>${list(utilization.topViewedSchemes.map((s) => ({ label: s.name, count: s.count })))}</div>
  <div><strong>Top Downloaded Summaries</strong>${list(utilization.topDownloadedSummaries.map((s) => ({ label: s.name, count: s.count })))}</div>
  <div><strong>Top Welfare Action Plans</strong>${list(utilization.topActionPlanSchemes.map((s) => ({ label: s.name, count: s.count })))}</div>
</div>

<h2>Welfare Risk Distribution</h2>
<table>
  ${row("High Risk Households", String(risk.high))}
  ${row("Moderate Risk Households", String(risk.moderate))}
  ${row("Low Risk Households", String(risk.low))}
  ${row("Total Households", String(risk.total))}
</table>
</body></html>`;
}
