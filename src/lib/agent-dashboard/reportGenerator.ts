import { formatINR } from "@/lib/welfare-gap/benefitEstimator";
import type { CitizenAssistanceRow } from "./types";

export type AgentReportKind =
  | "household"
  | "eligibility"
  | "navigator";

/**
 * Render a printable, anonymized agent report into a hidden iframe and open
 * the browser's print-to-PDF dialog. Mirrors the Insights export pattern.
 */
export function exportAgentReport(
  kind: AgentReportKind,
  row: CitizenAssistanceRow,
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
  iframe.title = "Sarkari Sahayak Agent Report";
  document.body.appendChild(iframe);

  const html = buildReportHtml(kind, row);
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function row(label: string, value: string): string {
  return `<tr><td style="padding:6px 12px;border-bottom:1px solid #eee">${escapeHtml(label)}</td><td style="padding:6px 12px;border-bottom:1px solid #eee;text-align:right;font-weight:600">${escapeHtml(value)}</td></tr>`;
}

function titleFor(kind: AgentReportKind): string {
  if (kind === "household") return "Household Welfare Report";
  if (kind === "eligibility") return "Eligibility Report";
  return "Welfare Navigator Action Plan";
}

function buildReportHtml(
  kind: AgentReportKind,
  data: CitizenAssistanceRow,
): string {
  const { citizen, household, workflow } = data;
  const title = titleFor(kind);
  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${escapeHtml(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:24px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
</style></head><body>
<h1>Sarkari Sahayak — ${escapeHtml(title)}</h1>
<div class="muted">Generated ${new Date().toLocaleString()} · Citizen ID ${escapeHtml(citizen.id)}</div>
<div class="banner">All recommendations are generated using verified government schemes and explainable eligibility logic.</div>

<h2>Citizen Profile</h2>
<table>
  ${row("Name", citizen.fullName)}
  ${row("Age", String(citizen.age))}
  ${row("State", citizen.state)}
  ${row("District", citizen.district)}
  ${row("Occupation", citizen.occupation)}
  ${row("Preferred Language", citizen.preferredLanguage)}
  ${row("Family Members", String(citizen.familyMemberCount))}
</table>

<h2>Household Welfare Summary</h2>
<table>
  ${row("Welfare Opportunity Score", `${household.opportunityScore} / 100`)}
  ${row("Welfare Tier", household.tier)}
  ${row("Risk Category", household.riskCategory)}
  ${row("Missed Opportunities", String(household.missedOpportunities))}
  ${row("Estimated Annual Benefit", formatINR(household.estimatedAnnualBenefitINR))}
</table>

<h2>Application Workflow</h2>
<table>
  ${row("Guides Opened", String(workflow.guidesOpened))}
  ${row("Summaries Accessed", String(workflow.summariesDownloaded))}
  ${row("Navigator Plans", String(workflow.navigatorPlansGenerated))}
  ${row("Application Status", workflow.applicationStatus)}
</table>
</body></html>`;
}
