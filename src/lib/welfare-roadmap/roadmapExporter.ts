import type { Roadmap } from "./types";

export type RoadmapExportKind = "personal" | "household" | "predictive";

function esc(s: string): string {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

function titleFor(kind: RoadmapExportKind): string {
  if (kind === "personal") return "Personal Welfare Roadmap";
  if (kind === "household") return "Household Welfare Roadmap";
  return "Predictive Welfare Summary";
}

export function exportRoadmap(kind: RoadmapExportKind, roadmap: Roadmap): void {
  if (typeof window === "undefined") return;
  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.setAttribute("aria-hidden", "true");
  iframe.title = "Sarkari Sahayak Welfare Roadmap";
  document.body.appendChild(iframe);

  const html = buildHtml(kind, roadmap);
  const trigger = () => {
    const w = iframe.contentWindow;
    if (!w) return;
    try {
      w.focus();
      w.print();
    } catch {
      /* fallback */
    }
    setTimeout(() => {
      if (iframe.parentNode) iframe.parentNode.removeChild(iframe);
    }, 1500);
  };
  iframe.onload = () => setTimeout(trigger, 250);
  iframe.srcdoc = html;
}

function buildHtml(kind: RoadmapExportKind, r: Roadmap): string {
  const title = titleFor(kind);

  const yearRows = r.years
    .map(
      (y) => `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #eee"><b>${y.year}</b></td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(y.focus)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(y.stage)} · Age ${y.age}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${
        y.schemes.map((s) => esc(s.scheme_name)).join(", ") || "—"
      }</td>
      <td style="padding:6px 10px;border-bottom:1px solid #eee">${esc(y.expectedOutcome)}</td>
    </tr>`,
    )
    .join("");

  const householdBlocks =
    kind !== "personal"
      ? r.household
          .map(
            (m) => `<div style="margin:10px 0;padding:10px 12px;border:1px solid #e5e7eb;border-radius:6px">
        <div style="font-weight:600">${esc(m.displayName)} · ${esc(m.stage)} · Age ${m.age}</div>
        <div style="font-size:12px;color:#374151">Predicted needs: ${esc(m.predictedNeeds.join(", ") || "—")}</div>
        <div style="font-size:12px;color:#374151">Future schemes: ${esc(m.futureSchemes.map((s) => s.scheme_name).join(", ") || "—")}</div>
        <div style="font-size:12px;color:#374151">Estimated annual benefit: ₹${m.estimatedAnnualBenefit.toLocaleString("en-IN")}</div>
      </div>`,
          )
          .join("")
      : "";

  const forecastBlocks =
    kind === "predictive"
      ? `
      <h2>Upcoming Opportunities</h2>
      <ul>${r.upcoming.map((u) => `<li>${esc(u.scheme.scheme_name)} — in ${u.yearsAway} year(s) · ${esc(u.reason)}</li>`).join("")}</ul>
      <h2>Missed Opportunities (Still Pursuable)</h2>
      <ul>${r.missed.map((u) => `<li>${esc(u.scheme.scheme_name)} — ${esc(u.reason)}</li>`).join("") || "<li>None detected</li>"}</ul>
      `
      : "";

  return `<!doctype html><html><head><meta charset="utf-8"/>
<title>Sarkari Sahayak — ${esc(title)}</title>
<style>
  @page { size: A4; margin: 16mm; }
  body{font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#111;margin:0;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px}
  h2{font-size:15px;margin:20px 0 8px;border-bottom:1px solid #ddd;padding-bottom:4px}
  .muted{color:#666;font-size:12px}
  .banner{background:#f4f7ff;border:1px solid #dbe4ff;padding:10px 12px;border-radius:6px;font-size:12px;color:#334;margin:12px 0}
  table{width:100%;border-collapse:collapse;font-size:13px}
  .stat{display:inline-block;margin-right:18px;font-size:13px}
  .stat b{font-size:18px;display:block}
</style></head><body>
<h1>Sarkari Sahayak — ${esc(title)}</h1>
<div class="muted">Generated ${new Date().toLocaleString()} · Citizen ${esc(r.profile.full_name)} · ${esc(r.profile.state)}</div>
<div class="banner">Future recommendations are generated using verified scheme rules, household context, and explainable welfare planning logic.</div>

<h2>Welfare Journey Score</h2>
<div>
  <div class="stat"><b>${r.journeyScore}/100</b>${esc(r.journeyBand)}</div>
  <div class="stat"><b>₹${r.longTermBenefit.toLocaleString("en-IN")}</b>5-Year Projected Benefits</div>
  <div class="stat"><b>${r.household.length}</b>Household Members</div>
</div>

<h2>5-Year Timeline</h2>
<table>
  <thead><tr>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Year</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Focus</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Life Stage</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Recommended Schemes</th>
    <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #ddd">Expected Outcome</th>
  </tr></thead>
  <tbody>${yearRows}</tbody>
</table>

${householdBlocks ? `<h2>Household Future Planning</h2>${householdBlocks}` : ""}
${forecastBlocks}

</body></html>`;
}
