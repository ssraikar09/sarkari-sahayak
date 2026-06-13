import type { EarlyWarningSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export type WarningReportKind =
  | "early-warning"
  | "district-summary"
  | "action-plan"
  | "evidence-pack";

const TITLES: Record<WarningReportKind, string> = {
  "early-warning": "Welfare Early Warning Report",
  "district-summary": "District Alert Summary",
  "action-plan": "Preventive Action Plan",
  "evidence-pack": "Alert Evidence Pack",
};


export function exportWarningReport(
  snap: EarlyWarningSnapshot,
  kind: WarningReportKind = "early-warning",
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

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function buildHtml(snap: EarlyWarningSnapshot, kind: WarningReportKind): string {
  const showActions = kind !== "district-summary" && kind !== "evidence-pack";
  const showExplain = kind === "early-warning" || kind === "evidence-pack";
  const showRegions = kind !== "action-plan";
  const showEvidence = kind === "evidence-pack";

  const summary = `
<h2>Summary</h2>
<table>
  <tr><td>Active alerts</td><td><b>${snap.summary.activeAlerts}</b></td></tr>
  <tr><td>Critical alerts</td><td><b>${snap.summary.criticalAlerts}</b></td></tr>
  <tr><td>High-priority alerts</td><td><b>${snap.summary.highPriorityAlerts}</b></td></tr>
  <tr><td>Households under observation</td><td><b>${snap.summary.householdsUnderObservation.toLocaleString()}</b></td></tr>
  <tr><td>Estimated benefits at risk</td><td><b>${formatINR(snap.summary.benefitsAtRiskINR)}</b></td></tr>
  <tr><td>Welfare readiness score</td><td><b>${snap.context.welfareReadinessScore}/100</b></td></tr>
</table>`;

  const alerts = snap.alerts
    .map(
      (a) => `
<div class="alert">
  <div style="font-weight:600">${esc(a.title)} <span class="badge">${a.severity}</span> <span class="badge" style="background:#eef;color:#335">${a.lifecycle}</span> <span class="badge" style="background:#efe;color:#264">${a.confidence} confidence</span></div>
  <div class="muted">${esc(a.categoryLabel)} · ${esc(a.region)} · ${a.householdsAffected.toLocaleString()} households · ${formatINR(a.potentialBenefitLossINR)} at risk</div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(a.rationale)}</div>
  ${
    showActions
      ? `<div style="font-size:12px;margin-top:6px"><b>Recommended actions:</b> ${a.recommendedActionLabels.map(esc).join("; ")}</div>`
      : ""
  }
  ${
    showExplain
      ? `<div style="font-size:11px;color:#555;margin-top:6px"><b>Triggering conditions:</b> ${a.triggeringConditions.map(esc).join("; ")}<br/><b>Deterministic rules:</b> ${a.deterministicRules.map(esc).join("; ")}<br/><b>Modules:</b> ${a.contributingModules.map(esc).join(", ")} · <b>Datasets:</b> ${a.referencedDatasets.map(esc).join(", ")}</div>`
      : ""
  }
  ${
    showEvidence
      ? `<div style="font-size:11px;color:#333;margin-top:6px"><b>Evidence:</b><ul style="margin:4px 0 0 18px">${a.evidence.map((e) => `<li>${esc(e)}</li>`).join("")}</ul></div>`
      : ""
  }
</div>`,
    )
    .join("");


  const regionBlock = showRegions
    ? `<h2>Region concentration</h2>
<table><tr><th>Region</th><th>Alerts</th><th>Households</th></tr>${snap.trends.regionConcentration
        .map(
          (r) =>
            `<tr><td>${esc(r.label)}</td><td>${r.count}</td><td>${r.households.toLocaleString()}</td></tr>`,
        )
        .join("")}</table>`
    : "";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak X — ${TITLES[kind]}</title>
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
  .alert{border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:10px 0}
  .badge{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;background:#fff1f1;color:#992222;margin-left:6px;text-transform:uppercase}
</style></head><body>
<h1>Sarkari Sahayak X — ${TITLES[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">All alerts are generated using deterministic welfare signals derived from verified platform datasets. Refreshes do not alter alerts unless underlying data changes.</div>
${summary}
${regionBlock}
<h2>Alert feed</h2>
${alerts || "<div class='muted'>No emerging welfare risks detected using current evidence.</div>"}
</body></html>`;
}
