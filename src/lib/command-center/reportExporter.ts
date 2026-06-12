import type { NationalSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export type CommandReportKind = "national" | "intervention" | "command";

export function exportCommandReport(
  snap: NationalSnapshot,
  kind: CommandReportKind = "command",
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
  iframe.title = "National Welfare Command Center Report";
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

function buildHtml(snap: NationalSnapshot, kind: CommandReportKind): string {
  const titles: Record<CommandReportKind, string> = {
    national: "National Welfare Report",
    intervention: "Intervention Summary",
    command: "Command Center Intelligence Report",
  };
  const { overview, leaderboard, alerts, interventions, goals, underperformingSchemes } = snap;
  const showAll = kind === "command";
  const showNational = showAll || kind === "national";
  const showIntervention = showAll || kind === "intervention";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak X — ${titles[kind]}</title>
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
  .badge{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;background:#eef;color:#335;margin-left:6px;text-transform:uppercase}
</style></head><body>
<h1>Sarkari Sahayak X — ${titles[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">Insights are generated deterministically from anonymized citizen analytics. No synthetic predictions are used.</div>

${
  showNational
    ? `
<h2>National Welfare Overview</h2>
<table>
  <tr><td>Households analyzed</td><td><b>${overview.householdsAnalyzed}</b></td></tr>
  <tr><td>Total eligible schemes identified</td><td><b>${overview.totalEligibleSchemes}</b></td></tr>
  <tr><td>National Opportunity Score</td><td><b>${overview.averageOpportunityScore}/100</b></td></tr>
  <tr><td>Welfare Readiness Score</td><td><b>${overview.welfareReadinessScore}/100</b></td></tr>
  <tr><td>High-risk households</td><td><b>${overview.highRiskPercentage}%</b></td></tr>
  <tr><td>Estimated benefits unlocked</td><td><b>${formatINR(overview.totalEstimatedBenefitsUnlockedINR)}</b></td></tr>
</table>

<h2>State Performance Leaderboard</h2>
<table><tr><th>State</th><th>Households</th><th>Opportunity</th><th>High-Risk %</th><th>Readiness</th><th>Benefits Unlocked</th></tr>
${leaderboard
  .map(
    (r) =>
      `<tr><td>${esc(r.state)}</td><td>${r.households}</td><td>${r.opportunityScore}/100</td><td>${r.highRiskPercentage}%</td><td>${r.welfareReadinessScore}/100</td><td>${formatINR(r.estimatedBenefitsUnlockedINR)}</td></tr>`,
  )
  .join("")}
</table>

<h2>Welfare Goal Tracker</h2>
<table><tr><th>Goal</th><th>Eligible (occurrences)</th><th>Explored</th><th>Utilization</th><th>Navigator Demand</th></tr>
${goals
  .map(
    (g) =>
      `<tr><td>${esc(g.goal)}</td><td>${g.eligibleSchemes}</td><td>${g.exploredOccurrences}</td><td>${g.utilizationPercent}%</td><td>${g.navigatorDemand}</td></tr>`,
  )
  .join("")}
</table>

<h2>Underperforming Schemes</h2>
<table><tr><th>Scheme</th><th>Category</th><th>Eligible Households</th><th>Utilization</th><th>Opportunity Gap</th></tr>
${underperformingSchemes
  .map(
    (s) =>
      `<tr><td>${esc(s.name)}</td><td>${esc(s.category)}</td><td>${s.eligibleHouseholds}</td><td>${s.utilizationPercent}%</td><td>${s.opportunityGap}</td></tr>`,
  )
  .join("")}
</table>`
    : ""
}

${
  showIntervention
    ? `
<h2>Welfare Alert Center</h2>
${alerts
  .map(
    (a) => `
<div class="rec">
  <div style="font-weight:600">${esc(a.title)}<span class="badge">${a.priority}</span></div>
  <div class="muted">${esc(a.region)} · ${esc(a.metric)}</div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(a.rationale)}</div>
  <ul style="font-size:12px;margin:6px 0 0 18px">${a.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
  <div style="font-size:11px;color:#888;margin-top:4px">Sources: ${a.sources.map(esc).join(", ")}</div>
</div>`,
  )
  .join("")}

<h2>Intervention Recommendations</h2>
${interventions
  .map(
    (i) => `
<div class="rec">
  <div style="font-weight:600">${esc(i.title)}<span class="badge">${i.priority}</span></div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(i.rationale)}</div>
  <ul style="font-size:12px;margin:6px 0 0 18px">${i.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul>
  <div style="font-size:12px;margin-top:6px"><b>Expected impact:</b> ${esc(i.expectedImpact)}</div>
  <div style="font-size:11px;color:#888;margin-top:4px">Sources: ${i.sources.map(esc).join(", ")}</div>
</div>`,
  )
  .join("")}`
    : ""
}
</body></html>`;
}
