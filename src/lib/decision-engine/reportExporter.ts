import type { DecisionReport, HouseholdMemberDecision } from "./types";

export type DecisionExportKind = "decision" | "evidence" | "household";

export function exportDecisionReport(
  kind: DecisionExportKind,
  report: DecisionReport,
  household: HouseholdMemberDecision[] = [],
): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Sarkari Sahayak Decision Report";
  document.body.appendChild(iframe);

  const html = buildHtml(kind, report, household);
  const trigger = () => {
    const w = iframe.contentWindow;
    if (!w) return;
    try {
      w.focus();
      w.print();
    } catch {
      /* user can print manually */
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };
  iframe.onload = () => setTimeout(trigger, 250);
  if ("srcdoc" in iframe) {
    iframe.srcdoc = html;
  } else {
    const doc = (iframe as HTMLIFrameElement).contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(html);
    doc.close();
  }
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function titleFor(kind: DecisionExportKind): string {
  if (kind === "decision") return "Decision Report";
  if (kind === "evidence") return "Eligibility Evidence Summary";
  return "Household Explainability Report";
}

function buildHtml(
  kind: DecisionExportKind,
  report: DecisionReport,
  household: HouseholdMemberDecision[],
): string {
  const title = titleFor(kind);
  const { profile, overview, decisions } = report;
  const top = decisions.slice(0, kind === "evidence" ? 30 : 15);

  const decisionRows = top
    .map(
      (d) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(d.scheme.scheme_name)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(d.status.replace("_", " "))}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee;text-align:right">${d.confidence.score}/100</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(d.confidence.label)}</td>
      </tr>`,
    )
    .join("");

  const evidenceBlocks =
    kind === "evidence"
      ? top
          .map(
            (d) => `
      <div style="margin:10px 0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px">
        <div style="font-weight:600">${esc(d.scheme.scheme_name)} — ${d.confidence.score}/100 ${esc(d.confidence.label)}</div>
        <ul style="margin:6px 0 0 18px;padding:0;font-size:12px;color:#1f2937">
          ${d.matched.map((m) => `<li>✓ ${esc(m.reason)}</li>`).join("")}
          ${d.unmet.map((m) => `<li style="color:#b91c1c">✗ ${esc(m.reason)}</li>`).join("")}
        </ul>
      </div>`,
          )
          .join("")
      : "";

  const householdBlocks =
    kind === "household"
      ? household
          .map(
            (h) => `
        <div style="margin:10px 0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px">
          <div style="font-weight:600">${esc(h.member.full_name)} · ${esc(h.member.relationship)} · Age ${h.member.age}</div>
          <div style="font-size:12px;color:#374151;margin-top:4px">
            Eligible: ${h.overview.eligible} · Partial: ${h.overview.partial} · Not eligible: ${h.overview.notEligible}
          </div>
          <div style="font-size:12px;margin-top:6px"><strong>Top eligible:</strong> ${h.topEligible.map((d) => esc(d.scheme.scheme_name)).join(", ") || "—"}</div>
          <div style="font-size:12px"><strong>Missed opportunities:</strong> ${h.topMissed.map((d) => esc(d.scheme.scheme_name)).join(", ") || "—"}</div>
        </div>`,
          )
          .join("")
      : "";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
  .stat{display:inline-block;margin-right:18px;font-size:13px}
  .stat b{font-size:18px;display:block}
</style></head><body>
<h1>Sarkari Sahayak — ${esc(title)}</h1>
<div class="muted">Generated ${new Date().toLocaleString()} · Citizen ID ${esc(profile.id)}</div>
<div class="banner">Decisions are generated using verified scheme rules and explainable eligibility logic.</div>

<h2>Citizen</h2>
<div class="muted">${esc(profile.full_name)} · ${esc(profile.state)} · ${esc(profile.occupation)} · Age ${profile.age}</div>

<h2>Decision Overview</h2>
<div>
  <div class="stat"><b>${overview.eligible}</b>Eligible (${overview.eligiblePct}%)</div>
  <div class="stat"><b>${overview.partial}</b>Partial (${overview.partialPct}%)</div>
  <div class="stat"><b>${overview.notEligible}</b>Not Eligible (${overview.notEligiblePct}%)</div>
  <div class="stat"><b>${overview.total}</b>Schemes Analysed</div>
</div>

<h2>Top Decisions</h2>
<table>
  <thead><tr>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Scheme</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Status</th>
    <th style="text-align:right;padding:6px 10px;border-bottom:2px solid #ddd">Score</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Confidence</th>
  </tr></thead>
  <tbody>${decisionRows}</tbody>
</table>

${evidenceBlocks ? `<h2>Evidence Detail</h2>${evidenceBlocks}` : ""}
${householdBlocks ? `<h2>Household Explainability</h2>${householdBlocks}` : ""}

</body></html>`;
}
