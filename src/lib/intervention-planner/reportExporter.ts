import type { InterventionPlannerSnapshot } from "./types";
import { formatINR } from "@/lib/welfare-gap/benefitEstimator";

export type PlannerReportKind = "plan" | "executive" | "stakeholder";

export function exportPlannerReport(
  snap: InterventionPlannerSnapshot,
  kind: PlannerReportKind = "plan",
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
  iframe.title = "Welfare Intervention Plan";
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

function buildHtml(snap: InterventionPlannerSnapshot, kind: PlannerReportKind): string {
  const titles: Record<PlannerReportKind, string> = {
    plan: "Welfare Intervention Plan",
    executive: "Executive Action Summary",
    stakeholder: "Stakeholder Briefing Report",
  };

  const roadmapById = new Map(snap.roadmaps.map((r) => [r.interventionId, r]));
  const resourceById = new Map(snap.resources.map((r) => [r.interventionId, r]));
  const forecastById = new Map(snap.forecasts.map((r) => [r.interventionId, r]));
  const riskById = new Map(snap.risks.map((r) => [r.interventionId, r]));
  const explainerById = new Map(snap.explainers.map((r) => [r.interventionId, r]));

  const showAll = kind === "plan";
  const showRoadmap = showAll || kind === "stakeholder";
  const showResources = showAll || kind === "stakeholder";
  const showExplain = showAll || kind === "stakeholder";
  const showRisks = showAll || kind === "executive" || kind === "stakeholder";

  const headerBlock = `
<h1>Sarkari Sahayak X — ${titles[kind]}</h1>
<div class="muted">Generated ${new Date(snap.generatedAt).toLocaleString()}</div>
<div class="banner">Deterministic, evidence-backed intervention strategies derived from Modules 16–20. No synthetic predictions.</div>
<h2>Welfare Impact Forecast (Aggregate)</h2>
<table>
  <tr><td>Households analyzed</td><td><b>${snap.context.householdsAnalyzed}</b></td></tr>
  <tr><td>Projected opportunity score lift</td><td><b>+${snap.aggregateForecast.opportunityScoreLift}</b></td></tr>
  <tr><td>Projected welfare readiness lift</td><td><b>+${snap.aggregateForecast.welfareReadinessLift}</b></td></tr>
  <tr><td>Projected high-risk household reduction</td><td><b>-${snap.aggregateForecast.highRiskReductionPct}%</b></td></tr>
  <tr><td>Projected missed opportunity reduction</td><td><b>-${snap.aggregateForecast.missedOpportunityReductionPct}%</b></td></tr>
  <tr><td>Projected annual benefit increase</td><td><b>${formatINR(snap.aggregateForecast.annualBenefitIncreaseINR)}</b></td></tr>
</table>`;

  const interventionBlock = snap.interventions
    .map((iv) => {
      const rm = roadmapById.get(iv.id);
      const res = resourceById.get(iv.id);
      const fc = forecastById.get(iv.id);
      const rk = riskById.get(iv.id);
      const ex = explainerById.get(iv.id);
      return `
<div class="rec">
  <div style="font-weight:600">${esc(iv.title)}<span class="badge">${iv.priority}</span></div>
  <div class="muted">Impact ${iv.impactScore}/100 · Population affected ${iv.populationAffected.toLocaleString()} · Benefit unlocked ${formatINR(iv.estimatedBenefitUnlockedINR)}</div>
  <div style="font-size:12px;color:#444;margin-top:4px">${esc(iv.rationale)}</div>
  ${
    fc
      ? `<div style="font-size:12px;margin-top:6px"><b>Forecast:</b> +${fc.opportunityScoreLift} opp · +${fc.welfareReadinessLift} readiness · -${fc.highRiskReductionPct}% high-risk · -${fc.missedOpportunityReductionPct}% missed · ${formatINR(fc.annualBenefitIncreaseINR)} benefits</div>`
      : ""
  }
  ${
    showResources && res
      ? `<div style="font-size:12px;margin-top:6px"><b>Resources:</b> ${res.cscOperators} CSC operators · ${res.documentationCamps} camps · ${res.awarenessSessions} sessions · ${res.navigatorFacilitators} facilitators · ${res.householdsExpectedToBenefit.toLocaleString()} households expected to benefit</div>`
      : ""
  }
  ${
    showRoadmap && rm
      ? rm.phases
          .map(
            (p) => `
<div style="margin-top:8px;border-left:3px solid #c8d4ff;padding-left:8px">
  <div style="font-weight:600;font-size:12px">${p.window} — ${esc(p.objective)}</div>
  <div style="font-size:11px;color:#555"><b>Activities:</b> ${p.activities.map(esc).join("; ")}</div>
  <div style="font-size:11px;color:#555"><b>Stakeholders:</b> ${p.stakeholders.map(esc).join(", ")}</div>
  <div style="font-size:11px;color:#555"><b>Milestones:</b> ${p.milestones.map((m) => esc(`${m.title} — ${m.detail}`)).join("; ")}</div>
  <div style="font-size:11px;color:#555"><b>Success indicators:</b> ${p.successIndicators.map(esc).join("; ")}</div>
</div>`,
          )
          .join("")
      : ""
  }
  ${
    showRisks && rk
      ? `<div style="margin-top:8px"><b style="font-size:12px">Risks & mitigations:</b><ul style="font-size:11px;margin:4px 0 0 18px">${rk.risks
          .map((r) => `<li>[${r.severity}] ${esc(r.risk)} — ${esc(r.mitigation)}</li>`)
          .join("")}</ul></div>`
      : ""
  }
  ${
    showExplain && ex
      ? `<div style="margin-top:8px;font-size:11px;color:#444"><b>Why recommended:</b> ${esc(ex.why)}<br/><b>Causal pathway:</b> ${esc(ex.causalPathway)}<br/><b>Modules:</b> ${ex.modules.map(esc).join(", ")} · <b>Datasets:</b> ${ex.datasets.map(esc).join(", ")}</div>`
      : ""
  }
</div>`;
    })
    .join("");

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
  .rec{border:1px solid #eee;border-radius:6px;padding:10px 12px;margin:10px 0}
  .badge{display:inline-block;font-size:10px;padding:2px 6px;border-radius:999px;background:#eef;color:#335;margin-left:6px;text-transform:uppercase}
</style></head><body>
${headerBlock}
<h2>Priority Intervention Queue</h2>
${interventionBlock}
</body></html>`;
}
