import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { HouseholdKnowledgeGraph } from "./types";

export type GraphExportKind = "household" | "network" | "research";

export function exportKnowledgeGraph(
  kind: GraphExportKind,
  graph: HouseholdKnowledgeGraph,
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
  document.body.appendChild(iframe);

  const html = buildHtml(kind, graph);
  iframe.onload = () =>
    setTimeout(() => {
      try {
        iframe.contentWindow?.focus();
        iframe.contentWindow?.print();
      } catch {
        /* user can print manually */
      }
      setTimeout(() => iframe.parentNode?.removeChild(iframe), 1500);
    }, 250);
  if ("srcdoc" in iframe) iframe.srcdoc = html;
  else {
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

function titleFor(kind: GraphExportKind): string {
  if (kind === "household") return "Household Knowledge Report";
  if (kind === "network") return "Welfare Network Report";
  return "Research Graph Summary";
}

function buildHtml(
  kind: GraphExportKind,
  graph: HouseholdKnowledgeGraph,
): string {
  const title = titleFor(kind);
  const memberRows = graph.members
    .map(
      (m) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(m.name)} <span style="color:#666">(${esc(m.relationship)})</span></td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${m.opportunityScore}/100</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${m.eligibleCount}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${m.missedCount}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(m.riskCategory)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(formatINR(m.estimatedAnnualBenefitINR))}</td>
      </tr>`,
    )
    .join("");

  const schemeRows = graph.schemes
    .slice(0, 25)
    .map(
      (s) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(s.schemeName)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(s.category)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${s.confidence}/100</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${s.relatedMemberIds.length}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${s.goalCategories.map(esc).join(", ")}</td>
      </tr>`,
    )
    .join("");

  const goalsRows = graph.goals
    .map(
      (g) => `<tr>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(g.category)}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${g.schemeIds.length}</td>
        <td style="padding:6px 10px;border-bottom:1px solid #eee">${g.memberIds.length}</td>
      </tr>`,
    )
    .join("");

  const insights = graph.insights;

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  th{text-align:left;padding:6px 10px;border-bottom:2px solid #ddd}
  .muted{color:#666;font-size:12px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
  .stat{display:inline-block;margin-right:18px;font-size:13px}
  .stat b{font-size:18px;display:block}
</style></head><body>
<h1>Sarkari Sahayak — ${esc(title)}</h1>
<div class="muted">Generated ${new Date().toLocaleString()} · Household ${esc(graph.citizenLabel)}</div>
<div class="banner">This graph is generated using verified scheme relationships and explainable eligibility logic.</div>

<h2>Household Members</h2>
<table><thead><tr>
  <th>Member</th><th>Score</th><th>Eligible</th><th>Missed</th><th>Risk</th><th>Annual Benefit</th>
</tr></thead><tbody>${memberRows || `<tr><td colspan="6" style="padding:10px;color:#666">No household data.</td></tr>`}</tbody></table>

${kind !== "research" ? `
<h2>Scheme Relationships</h2>
<table><thead><tr>
  <th>Scheme</th><th>Category</th><th>Confidence</th><th>Members</th><th>Goals</th>
</tr></thead><tbody>${schemeRows || `<tr><td colspan="5" style="padding:10px;color:#666">None.</td></tr>`}</tbody></table>` : ""}

${kind !== "household" ? `
<h2>Navigator Goal Connections</h2>
<table><thead><tr>
  <th>Goal</th><th>Schemes</th><th>Members benefiting</th>
</tr></thead><tbody>${goalsRows || `<tr><td colspan="3" style="padding:10px;color:#666">None.</td></tr>`}</tbody></table>` : ""}

<h2>Research Insights</h2>
<div>
  <div class="stat"><b>${insights.avgSchemesPerMember}</b>Avg schemes per member</div>
  <div class="stat"><b>${esc(formatINR(insights.avgBenefitsPerMemberINR))}</b>Avg benefits per member</div>
  <div class="stat"><b>${graph.schemes.length}</b>Schemes connected</div>
  <div class="stat"><b>${graph.goals.length}</b>Goal categories linked</div>
</div>
<h2>Most Connected Categories</h2>
<table><thead><tr><th>Category</th><th>Connections</th></tr></thead><tbody>
${insights.mostConnectedCategories.map((c) => `<tr><td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(c.category)}</td><td style="padding:6px 10px;border-bottom:1px solid #eee">${c.count}</td></tr>`).join("") || `<tr><td colspan="2" style="padding:10px;color:#666">None.</td></tr>`}
</tbody></table>

</body></html>`;
}
