import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { OutcomePredictionSnapshot } from "./types";

type ReportKind = "outcome" | "household";

export function exportOutcomeReport(
  snap: OutcomePredictionSnapshot,
  kind: ReportKind = "outcome",
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
  iframe.title = "Welfare Outcome Prediction Report";
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

function riskLabel(t: string): string {
  return t.charAt(0).toUpperCase() + t.slice(1);
}

function buildHtml(snap: OutcomePredictionSnapshot, kind: ReportKind): string {
  const titles: Record<ReportKind, string> = {
    outcome: "Welfare Outcome Prediction Report",
    household: "Household Outcome Forecast Summary",
  };

  const { summary, scenarios, research, explainers, households } = snap;
  const showHousehold = kind === "household";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${titles[kind]}</title>
<style>
  @page { size: A4; margin: 16mm; }
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
  .badge{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;background:#eef;color:#335;margin-left:6px}
  .delta-up{color:#047857;font-weight:600}
  .delta-down{color:#b91c1c;font-weight:600}
</style></head><body>
<h1>Sarkari Sahayak — ${titles[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">Predictions are deterministic — derived from anonymized citizen interactions, eligibility assessments, navigator logs, and the benefit-value estimator. No randomness.</div>

<h2>Outcome Summary</h2>
<table>
  <tr><th>Indicator</th><th>Current</th><th>Predicted</th></tr>
  <tr><td>Average Welfare Opportunity Score</td><td>${summary.currentAverageScore}/100</td><td><b>${summary.predictedAverageScore}/100</b></td></tr>
  <tr><td>Average Estimated Annual Benefits</td><td>${formatINR(summary.currentAverageBenefitsINR)}</td><td><b>${formatINR(summary.predictedAverageBenefitsINR)}</b></td></tr>
  <tr><td>High Welfare-Risk Share</td><td>${summary.currentHighRiskPct}%</td><td><b>${summary.predictedHighRiskPct}%</b></td></tr>
  <tr><td>Households Analyzed</td><td colspan="2">${summary.households}</td></tr>
</table>

<h2>Scenario Forecasts</h2>
<table>
  <tr><th>Scenario</th><th>Avg Score (predicted)</th><th>Avg Benefits (predicted)</th><th>Score Lift</th><th>Benefit Lift</th><th>Readiness Lift</th></tr>
  ${scenarios
    .map(
      (s) => `<tr>
        <td><b>${esc(s.label)}</b><div class="muted">${esc(s.description)}</div></td>
        <td>${s.predictedAverageScore}/100</td>
        <td>${formatINR(s.predictedAverageBenefitsINR)}</td>
        <td class="delta-up">+${s.averageScoreLift}</td>
        <td class="delta-up">+${formatINR(s.averageBenefitLiftINR)}</td>
        <td>${s.readinessLiftPct}%</td>
      </tr>`,
    )
    .join("")}
</table>

<h2>Research Insights</h2>
<table>
  <tr><td>Average predicted benefit gain per household</td><td><b>${formatINR(
    research.averagePredictedBenefitGainINR,
  )}</b></td></tr>
  <tr><td>Average predicted risk reduction</td><td><b>${research.averagePredictedRiskReductionPct} pp</b></td></tr>
</table>
<h3>Most impactful scheme categories</h3>
<table>
  <tr><th>Category</th><th>Predicted benefit gain</th><th>Households</th></tr>
  ${research.mostImpactfulCategories
    .map(
      (c) =>
        `<tr><td>${esc(c.category)}</td><td>${formatINR(c.predictedBenefitGainINR)}</td><td>${c.affectedHouseholds}</td></tr>`,
    )
    .join("")}
</table>

<h2>Explainability</h2>
${explainers
  .map(
    (e) => `
<div class="card">
  <div style="font-weight:600">${esc(e.prediction)}</div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(e.rationale)}</div>
  <div style="font-size:11px;color:#555;margin-top:6px"><b>Actions:</b> ${e.actions.map(esc).join(" · ")}</div>
  <div style="font-size:11px;color:#888;margin-top:4px"><b>Sources:</b> ${e.sources.map(esc).join(", ")}</div>
</div>`,
  )
  .join("")}

${
  showHousehold
    ? `
<h2>Household Forecast Detail</h2>
<table>
  <tr><th>Household</th><th>State</th><th>Eligible</th><th>Explored</th><th>Current Score</th><th>Predicted (All)</th><th>Current Risk</th><th>Predicted Risk (All)</th></tr>
  ${households
    .map((h) => {
      const all = h.scenarios.find((s) => s.scenarioId === "all");
      return `<tr>
        <td>${esc(h.snapshot.fullName)}</td>
        <td>${esc(h.snapshot.state)}</td>
        <td>${h.snapshot.eligibleCount}</td>
        <td>${h.snapshot.exploredCount}</td>
        <td>${h.snapshot.currentScore}/100</td>
        <td><b>${all?.predictedScore ?? "—"}/100</b></td>
        <td>${riskLabel(h.snapshot.currentRisk)}</td>
        <td><b>${all ? riskLabel(all.predictedRisk) : "—"}</b></td>
      </tr>`;
    })
    .join("")}
</table>`
    : ""
}
</body></html>`;
}
