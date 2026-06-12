import type { PolicyIntelligenceSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

type ReportKind = "policy" | "gap" | "regional";

export function exportPolicyReport(
  snap: PolicyIntelligenceSnapshot,
  kind: ReportKind = "policy",
): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  Object.assign(iframe.style, {
    position: "fixed",
    right: "0",
    bottom: "0",
    width: "0",
    height: "0",
    border: "0",
  });
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Policy Intelligence Report";
  document.body.appendChild(iframe);

  iframe.onload = () => {
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch (err) {
        console.warn("Print failed", err);
      }
      setTimeout(() => iframe.parentNode?.removeChild(iframe), 1500);
    }, 250);
  };

  iframe.srcdoc = buildHtml(snap, kind);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildHtml(snap: PolicyIntelligenceSnapshot, kind: ReportKind): string {
  const titles: Record<ReportKind, string> = {
    policy: "Policy Intelligence Report",
    gap: "Welfare Gap Report",
    regional: "Regional Welfare Summary",
  };
  const { overview, exclusion, regional, recommendations, risk } = snap;
  const showAll = kind === "policy";
  const showGap = showAll || kind === "gap";
  const showRegional = showAll || kind === "regional";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${titles[kind]}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
  th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left}
  th{background:#f7f7fa;font-weight:600}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;margin:12px 0}
  .rec{border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:8px 0}
  .badge{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;background:#eef;color:#335;margin-left:6px}
</style></head><body>
<h1>Sarkari Sahayak — ${titles[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">Insights are generated using anonymized citizen interactions, verified welfare recommendations, and explainable aggregation logic.</div>

<h2>National Welfare Overview</h2>
<table>
  <tr><td>Households analyzed</td><td><b>${overview.householdsAnalyzed}</b></td></tr>
  <tr><td>Average Opportunity Score</td><td><b>${overview.averageOpportunityScore}/100</b></td></tr>
  <tr><td>Average Missed Opportunities</td><td><b>${overview.averageMissedOpportunities}</b></td></tr>
  <tr><td>Average Estimated Annual Benefits</td><td><b>${formatINR(overview.averageEstimatedAnnualBenefitsINR)}</b></td></tr>
  <tr><td>High-risk Households</td><td><b>${overview.highRiskPercentage}%</b></td></tr>
</table>

${
  showGap
    ? `
<h2>Welfare Exclusion Analysis</h2>
<h3 style="font-size:13px;margin-top:10px">Top Missed Categories</h3>
<table><tr><th>Category</th><th>Missed Occurrences</th></tr>
${exclusion.topMissedCategories
  .map((c) => `<tr><td>${esc(c.category)}</td><td>${c.count}</td></tr>`)
  .join("")}
</table>
<h3 style="font-size:13px;margin-top:10px">Most Underutilized Schemes</h3>
<table><tr><th>Scheme</th><th>Category</th><th>Eligible</th><th>Explored</th><th>Utilization</th></tr>
${exclusion.underutilizedSchemes
  .map(
    (s) =>
      `<tr><td>${esc(s.name)}</td><td>${esc(s.category)}</td><td>${s.eligibleCount}</td><td>${s.exploredCount}</td><td>${Math.round(s.utilizationRate * 100)}%</td></tr>`,
  )
  .join("")}
</table>
<h3 style="font-size:13px;margin-top:10px">Underserved Beneficiary Groups</h3>
<table><tr><th>Group</th><th>Households</th><th>Avg Missed</th><th>Avg Score</th></tr>
${exclusion.underservedGroups
  .map(
    (g) =>
      `<tr><td>${esc(g.group)}</td><td>${g.affectedHouseholds}</td><td>${g.averageMissed}</td><td>${g.averageOpportunityScore}/100</td></tr>`,
  )
  .join("")}
</table>`
    : ""
}

${
  showRegional
    ? `
<h2>Regional Policy Intelligence</h2>
<h3 style="font-size:13px;margin-top:10px">State-wise Demand</h3>
<table><tr><th>State</th><th>Top Category</th><th>Top Goal</th><th>Interactions</th></tr>
${regional.demand
  .map(
    (r) =>
      `<tr><td>${esc(r.state)}</td><td>${esc(r.topCategory)}</td><td>${esc(r.topGoal)}</td><td>${r.totalInteractions}</td></tr>`,
  )
  .join("")}
</table>
<h3 style="font-size:13px;margin-top:10px">State-wise Welfare Risk</h3>
<table><tr><th>State</th><th>Households</th><th>Avg Score</th><th>High</th><th>Moderate</th><th>Low</th></tr>
${regional.risk
  .map(
    (r) =>
      `<tr><td>${esc(r.state)}</td><td>${r.households}</td><td>${r.averageOpportunityScore}/100</td><td>${r.high}</td><td>${r.moderate}</td><td>${r.low}</td></tr>`,
  )
  .join("")}
</table>`
    : ""
}

${
  showAll
    ? `
<h2>Explainable Policy Recommendations</h2>
${recommendations
  .map(
    (r) => `
<div class="rec">
  <div style="font-weight:600">${esc(r.title)}<span class="badge">${r.priority}</span></div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(r.rationale)}</div>
  <ul style="font-size:12px;margin:6px 0 0 18px">${r.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
  <div style="font-size:11px;color:#888;margin-top:4px">Sources: ${r.sources.map(esc).join(", ")}</div>
</div>`,
  )
  .join("")}

<h2>Welfare Risk Distribution</h2>
<table>
  <tr><td>High Risk Households</td><td>${risk.high}</td></tr>
  <tr><td>Moderate Risk Households</td><td>${risk.moderate}</td></tr>
  <tr><td>Low Risk Households</td><td>${risk.low}</td></tr>
  <tr><td>Total</td><td>${risk.total}</td></tr>
</table>`
    : ""
}
</body></html>`;
}
