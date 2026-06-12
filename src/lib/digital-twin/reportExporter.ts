import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import { LEVERS } from "./presets";
import { buildAuditTrail, buildExplainers } from "./explainability";
import { generateNarrative } from "./summaryGenerator";
import type { DigitalTwinBaseline, DigitalTwinForecast } from "./types";

export type DigitalTwinReportKind = "twin" | "intervention" | "evidence";

const TITLES: Record<DigitalTwinReportKind, string> = {
  twin: "Welfare Digital Twin Report",
  intervention: "Policy Intervention Summary",
  evidence: "Forecast Evidence Report",
};

export function exportDigitalTwinReport(
  baseline: DigitalTwinBaseline,
  forecast: DigitalTwinForecast,
  kind: DigitalTwinReportKind = "twin",
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
  iframe.srcdoc = buildHtml(baseline, forecast, kind);
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildHtml(
  baseline: DigitalTwinBaseline,
  forecast: DigitalTwinForecast,
  kind: DigitalTwinReportKind,
): string {
  const explainers = buildExplainers(baseline, forecast);
  const audit = buildAuditTrail(forecast.levers);
  const narrative = generateNarrative(baseline, forecast);

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${TITLES[kind]}</title>
<style>
@page{size:A4;margin:16mm}
body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
h1{font-size:22px;margin:0 0 4px}
h2{font-size:15px;margin:22px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
h3{font-size:13px;margin:14px 0 6px}
.muted{color:#666;font-size:12px}
table{width:100%;border-collapse:collapse;font-size:13px;margin-top:6px}
th,td{padding:6px 10px;border-bottom:1px solid #eee;text-align:left;vertical-align:top}
th{background:#f7f7fa;font-weight:600}
.banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;margin:12px 0}
.card{border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:8px 0}
.delta-up{color:#047857;font-weight:600}
.code{font-family:ui-monospace,Menlo,monospace;font-size:11px;background:#f5f5fb;padding:2px 5px;border-radius:3px}
</style></head><body>
<h1>Sarkari Sahayak — ${TITLES[kind]}</h1>
<div class="muted">Generated ${new Date(forecast.generatedAt).toLocaleString()}</div>
<div class="banner"><b>Deterministic forecast.</b> Derived from anonymized eligibility, navigator, CSC, and application-guide analytics. No randomness, no external models.</div>

<h2>Research Summary</h2>
<div class="card">${esc(narrative)}</div>

<h2>Baseline vs Simulated</h2>
<table>
  <tr><th>Indicator</th><th>Current</th><th>Simulated</th><th>Change</th></tr>
  <tr><td>Average opportunity score</td><td>${baseline.totals.averageOpportunityScore}/100</td><td><b>${forecast.simulated.averageOpportunityScore}/100</b></td><td class="delta-up">+${forecast.deltas.opportunityScore}</td></tr>
  <tr><td>Average annual benefits</td><td>${formatINR(baseline.totals.averageAnnualBenefitsINR)}</td><td><b>${formatINR(forecast.simulated.averageAnnualBenefitsINR)}</b></td><td class="delta-up">+${formatINR(forecast.deltas.benefitGainINR)}</td></tr>
  <tr><td>High welfare-risk share</td><td>${baseline.totals.highRiskPct}%</td><td><b>${forecast.simulated.highRiskPct}%</b></td><td class="delta-up">−${forecast.deltas.riskReductionPct} pp</td></tr>
  <tr><td>Welfare readiness score</td><td>${baseline.totals.welfareReadinessScore}/100</td><td><b>${forecast.simulated.welfareReadinessScore}/100</b></td><td class="delta-up">+${forecast.deltas.readinessLift}</td></tr>
  <tr><td>Average missed opportunities</td><td>${baseline.totals.averageMissedOpportunities}</td><td><b>${forecast.simulated.averageMissedOpportunities}</b></td><td class="delta-up">−${forecast.deltas.missedReduction}</td></tr>
  <tr><td>Households analysed</td><td colspan="3">${baseline.totals.households}</td></tr>
</table>

<h2>Intervention Inputs</h2>
<table>
  <tr><th>Lever</th><th>Setting</th><th>Source module</th><th>Weight</th></tr>
  ${LEVERS.map(
    (l) => `<tr>
      <td><b>${esc(l.label)}</b><div class="muted">${esc(l.description)}</div></td>
      <td>${forecast.levers[l.id]}%</td>
      <td>${esc(l.module)}</td>
      <td>${l.weight}</td>
    </tr>`,
  ).join("")}
</table>

<h2>Lever Contribution</h2>
<table>
  <tr><th>Lever</th><th>Contribution to lift</th><th>Score impact</th><th>Benefit impact</th></tr>
  ${forecast.contributions
    .map(
      (c) => `<tr>
      <td>${esc(c.label)}</td>
      <td>${c.contributionPct}%</td>
      <td>+${c.scoreLift}</td>
      <td>+${formatINR(c.benefitLiftINR)}</td>
    </tr>`,
    )
    .join("")}
</table>

<h2>Explainability — Why these numbers?</h2>
${explainers
  .map(
    (e) => `
<div class="card">
  <div style="font-weight:600">${esc(e.headline)}</div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(e.rationale)}</div>
  <div style="font-size:11px;color:#555;margin-top:6px"><b>Evidence:</b> ${e.evidence.map(esc).join(" · ")}</div>
  <div style="font-size:11px;color:#888;margin-top:4px"><b>Sources:</b> ${e.sources.map(esc).join(", ")}</div>
</div>`,
  )
  .join("")}

<h2>Audit Trail</h2>
<div class="card">
  <div class="muted">Timestamp: ${esc(audit.timestamp)}</div>
  <h3>Formulas</h3>
  ${audit.formulas.map((f) => `<div><b>${esc(f.name)}:</b> <span class="code">${esc(f.formula)}</span></div>`).join("")}
  <h3>Source datasets</h3>
  <div>${audit.sources.map(esc).join(" · ")}</div>
  <h3>Input assumptions</h3>
  <div>${LEVERS.map((l) => `${esc(l.short)}=${audit.inputs[l.id]}%`).join(" · ")}</div>
</div>
</body></html>`;
}
