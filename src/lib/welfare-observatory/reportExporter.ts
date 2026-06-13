import type { WelfareObservatorySnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export type ObservatoryReportKind =
  | "national"
  | "executive"
  | "ecosystem"
  | "annual"
  | "cross-module";

const TITLES: Record<ObservatoryReportKind, string> = {
  national: "National Welfare Intelligence Report",
  executive: "Executive Observatory Summary",
  ecosystem: "Welfare Ecosystem Report",
  annual: "Annual Welfare Insights Pack",
  "cross-module": "Cross-Module Intelligence Report",
};

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function exportObservatoryReport(
  snap: WelfareObservatorySnapshot,
  kind: ObservatoryReportKind = "national",
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

function buildHtml(snap: WelfareObservatorySnapshot, kind: ObservatoryReportKind): string {
  const showLifecycle = kind !== "executive";
  const showInsights = true;
  const showMatrix = kind === "cross-module" || kind === "national" || kind === "ecosystem" || kind === "annual";
  const showTrends = kind !== "executive";
  const showEvidence = kind !== "executive";

  const s = snap.summary;
  const summaryBlock = `
<h1>Sarkari Sahayak — ${TITLES[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">All observatory insights are derived deterministically from verified welfare datasets generated throughout the Sarkari Sahayak ecosystem. Refreshes do not alter outcomes unless underlying evidence changes.</div>
<h2>National Welfare Snapshot</h2>
<table>
  <tr><td>Households analyzed</td><td><b>${s.householdsAnalyzed.toLocaleString()}</b></td></tr>
  <tr><td>Schemes monitored</td><td><b>${s.schemesMonitored.toLocaleString()}</b></td></tr>
  <tr><td>Welfare opportunity score</td><td><b>${s.opportunityScore}/100</b></td></tr>
  <tr><td>Welfare readiness score</td><td><b>${s.welfareReadinessScore}/100</b></td></tr>
  <tr><td>Annual benefits unlocked</td><td><b>${formatINR(s.annualBenefitsUnlockedINR)}</b></td></tr>
  <tr><td>High-risk households</td><td><b>${s.highRiskHouseholds.toLocaleString()}</b></td></tr>
  <tr><td>Active interventions</td><td><b>${s.activeInterventions}</b></td></tr>
  <tr><td>Active alerts</td><td><b>${s.activeAlerts}</b></td></tr>
  <tr><td>Impact initiatives monitored</td><td><b>${s.impactInitiativesMonitored}</b></td></tr>
</table>`;

  const lifecycleBlock = showLifecycle
    ? `<h2>Welfare Lifecycle Observatory</h2>
<table>
  <tr><th>Stage</th><th>Module</th><th>Metric</th></tr>
  ${snap.lifecycle
    .map(
      (l) =>
        `<tr><td>${esc(l.label)}</td><td class="muted">${esc(l.module)}</td><td>${esc(l.metricLabel)}: <b>${esc(l.metricValue)}</b></td></tr>`,
    )
    .join("")}
</table>`
    : "";

  const insightsBlock = showInsights
    ? `<h2>National Intelligence Summary</h2>
${snap.insights
  .map(
    (i) => `<div class="rec">
  <div style="font-weight:600">${esc(i.title)}</div>
  <div style="font-size:12px;color:#333">${esc(i.detail)}</div>
  <div style="font-size:11px;color:#555;margin-top:4px"><b>Modules:</b> ${i.contributingModules.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#555"><b>Evidence:</b> ${esc(i.evidence)}</div>
</div>`,
  )
  .join("")}`
    : "";

  const trendsBlock = showTrends
    ? `<h2>Observatory Analytics Center</h2>
<table>
  <tr><th>Trend</th><th>Series</th><th>Δ</th><th>Source</th></tr>
  ${snap.trends
    .map(
      (t) =>
        `<tr><td>${esc(t.label)}</td><td>${t.series.map((p) => `${esc(p.label)}: ${p.value}${esc(p.unit)}`).join(" → ")}</td><td>${t.delta} ${esc(t.deltaUnit)}</td><td class="muted">${esc(t.source)}</td></tr>`,
    )
    .join("")}
</table>`
    : "";

  const matrixBlock = showMatrix
    ? `<h2>Cross-Module Intelligence Matrix</h2>
${snap.matrix
  .map(
    (band) => `<h3 style="font-size:13px;margin:14px 0 4px">${esc(band.band)}</h3>
<table>
  <tr><th>Module</th><th>Contribution</th><th>Outcome</th></tr>
  ${band.modules
    .map(
      (m) =>
        `<tr><td>${esc(m.name)}</td><td>${esc(m.contribution)}</td><td>${esc(m.outcome)}</td></tr>`,
    )
    .join("")}
</table>`,
  )
  .join("")}`
    : "";

  const evidenceBlock = showEvidence
    ? `<h2>Explainability & Evidence</h2>
${snap.explainers
  .map(
    (e) => `<div class="rec">
  <div style="font-weight:600">${esc(e.insight)}</div>
  <div style="font-size:11px;color:#555"><b>Modules:</b> ${e.modules.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#555"><b>Datasets:</b> ${e.datasets.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#555"><b>Rules:</b> ${e.rules.map(esc).join(" · ")}</div>
  <div style="font-size:11px;color:#444;margin-top:4px">${esc(e.evidence)}</div>
</div>`,
  )
  .join("")}`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${TITLES[kind]}</title>
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
${lifecycleBlock}
${insightsBlock}
${trendsBlock}
${matrixBlock}
${evidenceBlock}
</body></html>`;
}
