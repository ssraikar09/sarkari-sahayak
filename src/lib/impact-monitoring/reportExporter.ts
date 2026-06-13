import type { ImpactMonitoringSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export type ImpactReportKind =
  | "impact"
  | "effectiveness"
  | "regional"
  | "evidence";

const TITLES: Record<ImpactReportKind, string> = {
  impact: "Welfare Impact Report",
  effectiveness: "Intervention Effectiveness Summary",
  regional: "Regional Impact Assessment",
  evidence: "Welfare Outcome Evidence Pack",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function exportImpactReport(
  snap: ImpactMonitoringSnapshot,
  kind: ImpactReportKind = "impact",
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
  iframe.title = TITLES[kind];
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

function buildHtml(snap: ImpactMonitoringSnapshot, kind: ImpactReportKind): string {
  const showInterventions = kind !== "regional";
  const showRegional = kind === "regional" || kind === "impact" || kind === "evidence";
  const showEvidence = kind === "evidence" || kind === "impact";
  const showIndicators = kind === "effectiveness" || kind === "impact" || kind === "evidence";

  const ba = snap.beforeAfter;
  const summaryBlock = `
<h1>Sarkari Sahayak X — ${TITLES[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">Impact metrics are derived deterministically from verified welfare datasets and intervention records. Refreshes do not alter outcomes unless underlying evidence changes.</div>
<h2>Executive Impact Summary</h2>
<table>
  <tr><td>Interventions monitored</td><td><b>${snap.summary.interventionsMonitored}</b></td></tr>
  <tr><td>Households positively impacted</td><td><b>${snap.summary.householdsPositivelyImpacted.toLocaleString()}</b></td></tr>
  <tr><td>Opportunity score uplift</td><td><b>+${snap.summary.opportunityScoreUplift}</b></td></tr>
  <tr><td>Welfare readiness uplift</td><td><b>+${snap.summary.welfareReadinessUplift}</b></td></tr>
  <tr><td>High-risk reduction</td><td><b>-${snap.summary.highRiskReductionPct}%</b></td></tr>
  <tr><td>Annual benefits unlocked</td><td><b>${formatINR(snap.summary.annualBenefitsUnlockedINR)}</b></td></tr>
  <tr><td>Average completion</td><td><b>${snap.summary.averageCompletionPct}%</b></td></tr>
</table>
<h2>Before vs After</h2>
<table>
  <tr><th>Metric</th><th>Before</th><th>After</th><th>Δ</th></tr>
  <tr><td>Opportunity score</td><td>${ba.before.opportunityScore}</td><td>${ba.after.opportunityScore}</td><td>${ba.deltaPct.opportunityScore}%</td></tr>
  <tr><td>Welfare readiness</td><td>${ba.before.welfareReadinessScore}</td><td>${ba.after.welfareReadinessScore}</td><td>${ba.deltaPct.welfareReadinessScore}%</td></tr>
  <tr><td>High-risk households</td><td>${ba.before.highRiskPercentage}%</td><td>${ba.after.highRiskPercentage}%</td><td>${ba.deltaPct.highRiskPercentage}%</td></tr>
  <tr><td>Missed opportunities</td><td>${ba.before.missedOpportunityPercentage}%</td><td>${ba.after.missedOpportunityPercentage}%</td><td>${ba.deltaPct.missedOpportunityPercentage}%</td></tr>
  <tr><td>Annual benefits</td><td>${formatINR(ba.before.annualBenefitsINR)}</td><td>${formatINR(ba.after.annualBenefitsINR)}</td><td>${ba.deltaPct.annualBenefitsINR}%</td></tr>
</table>`;

  const interventionsBlock = showInterventions
    ? `<h2>Intervention Performance</h2>
<table>
  <tr><th>Intervention</th><th>Status</th><th>Reach</th><th>Opp +</th><th>Readiness +</th><th>Risk -</th><th>Benefits</th><th>Effectiveness</th></tr>
  ${snap.interventions
    .map(
      (i) => `<tr>
    <td>${esc(i.title)}</td>
    <td>${i.status}</td>
    <td>${i.householdsReached.toLocaleString()} / ${i.householdsTargeted.toLocaleString()}</td>
    <td>+${i.opportunityScoreImprovement}</td>
    <td>+${i.readinessScoreImprovement}</td>
    <td>-${i.highRiskReductionPct}%</td>
    <td>${formatINR(i.benefitsUnlockedINR)}</td>
    <td>${i.effectivenessScore}/100</td>
  </tr>`,
    )
    .join("")}
</table>`
    : "";

  const indicatorsBlock = showIndicators
    ? `<h2>Success Indicators</h2>
<table>
  <tr><th>Indicator</th><th>Baseline</th><th>Current</th><th>Change</th><th>Source</th></tr>
  ${snap.indicators
    .map(
      (i) =>
        `<tr><td>${esc(i.label)}</td><td>${i.baseline} ${i.unit}</td><td>${i.current} ${i.unit}</td><td>${i.changePct >= 0 ? "+" : ""}${i.changePct}%</td><td class="muted">${esc(i.source)}</td></tr>`,
    )
    .join("")}
</table>`
    : "";

  const regionalBlock = showRegional
    ? `<h2>Regional Impact</h2>
<table>
  <tr><th>State</th><th>Households impacted</th><th>Benefits unlocked</th><th>Opp +</th><th>Risk -</th></tr>
  ${snap.regional
    .map(
      (r) => `<tr>
    <td>${esc(r.state)}</td>
    <td>${r.householdsImpacted.toLocaleString()}</td>
    <td>${formatINR(r.benefitsUnlockedINR)}</td>
    <td>+${r.opportunityScoreImprovement}</td>
    <td>-${r.riskReductionPct}%</td>
  </tr>`,
    )
    .join("")}
</table>`
    : "";

  const evidenceBlock = showEvidence
    ? `<h2>Explainability & Evidence</h2>
${snap.explainers
  .map(
    (e) => `<div class="rec">
  <div style="font-weight:600">${esc(e.metric)}</div>
  <div style="font-size:11px;color:#555"><b>Formula:</b> ${esc(e.formula)}</div>
  <div style="font-size:11px;color:#555"><b>Modules:</b> ${e.modules.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#555"><b>Datasets:</b> ${e.datasets.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#444;margin-top:4px">${esc(e.evidence)}</div>
</div>`,
  )
  .join("")}`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak X — ${TITLES[kind]}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6px}
  th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
  th{background:#f7f7fa;font-weight:600}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;margin:12px 0}
  .rec{border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:10px 0}
</style></head><body>
${summaryBlock}
${interventionsBlock}
${indicatorsBlock}
${regionalBlock}
${evidenceBlock}
</body></html>`;
}
