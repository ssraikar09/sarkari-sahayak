import type { InterventionRoadmap, PlannerIntervention } from "./types";
import type { InterventionKind } from "./types";

type PhaseTemplate = {
  objective: string;
  activities: string[];
  stakeholders: string[];
  milestones: { title: string; detail: string }[];
  successIndicators: string[];
};

const TEMPLATES: Record<InterventionKind, [PhaseTemplate, PhaseTemplate, PhaseTemplate]> = {
  "csc-outreach": [
    {
      objective: "Mobilize CSC operators in identified high-risk districts.",
      activities: [
        "Map low-opportunity districts using leaderboard data",
        "Onboard CSC operators with the Sarkari Sahayak agent dashboard",
        "Schedule weekly outreach camps in priority panchayats",
      ],
      stakeholders: ["District CSC Coordinator", "State Welfare Officer", "Local Panchayat"],
      milestones: [
        { title: "District selection finalized", detail: "Top 5 districts by opportunity gap chosen." },
        { title: "Operators onboarded", detail: "Targeted operator network operational on the CSC dashboard." },
      ],
      successIndicators: [
        "Number of households assessed via CSC",
        "Outreach camps held vs planned",
      ],
    },
    {
      objective: "Scale CSC operations to adjacent blocks.",
      activities: [
        "Replicate outreach playbook in adjacent blocks",
        "Introduce monthly review using Command Center alerts",
        "Cross-train operators on documentation workflows",
      ],
      stakeholders: ["State Welfare Officer", "CSC Operators", "NGO partners"],
      milestones: [
        { title: "Coverage doubled", detail: "Active operator footprint expanded to adjacent blocks." },
        { title: "First impact review", detail: "Command Center alert reduction measured." },
      ],
      successIndicators: [
        "Reduction in welfare-exclusion alerts",
        "Increase in eligible-but-unexplored conversions",
      ],
    },
    {
      objective: "Institutionalize CSC-led welfare delivery cadence.",
      activities: [
        "Embed CSC outreach KPIs into state welfare reviews",
        "Publish quarterly opportunity-score scorecards",
        "Sustain operator retention through performance incentives",
      ],
      stakeholders: ["State Welfare Department", "District Administration"],
      milestones: [
        { title: "Scorecard institutionalized", detail: "Quarterly publication via Command Center exports." },
        { title: "Operator retention plan", detail: "Performance-linked incentives approved." },
      ],
      successIndicators: [
        "Sustained reduction in high-risk household share",
        "State-level Welfare Readiness Score uplift",
      ],
    },
  ],
  "documentation-assistance": [
    {
      objective: "Launch documentation assistance desks where evidence collection stalls.",
      activities: [
        "Audit top scheme categories with missed opportunities",
        "Stand up document help desks at CSC and panchayat offices",
        "Distribute checklist guides from the Application Guide module",
      ],
      stakeholders: ["CSC Operators", "Block Welfare Officer", "Documentation Volunteers"],
      milestones: [
        { title: "Help desks live", detail: "Document assistance available across priority blocks." },
        { title: "Checklists distributed", detail: "Application Guide checklists handed to assisted households." },
      ],
      successIndicators: [
        "Households assisted with documentation",
        "Reduction in documentation-barrier alerts",
      ],
    },
    {
      objective: "Strengthen documentation workflows with feedback loops.",
      activities: [
        "Track missing-document patterns via the agent dashboard",
        "Pre-stage commonly missing certificates with local issuers",
        "Run targeted Aadhaar / income / caste certificate drives",
      ],
      stakeholders: ["Tehsildar / SDM office", "CSC Operators", "Revenue Department"],
      milestones: [
        { title: "Certificate drives", detail: "Joint drives held with issuing authorities." },
        { title: "Workflow refresh", detail: "Updated documentation playbook based on observed gaps." },
      ],
      successIndicators: [
        "Application completion rate improvement",
        "Average time-to-document reduction",
      ],
    },
    {
      objective: "Operationalize documentation support as standard practice.",
      activities: [
        "Codify SOPs for documentation assistance in CSC operations",
        "Train second-tier operators across remaining districts",
        "Establish escalation paths for chronic document blockers",
      ],
      stakeholders: ["State Welfare Department", "CSC Network"],
      milestones: [
        { title: "SOPs published", detail: "Documentation SOP rolled out statewide." },
        { title: "Escalation matrix", detail: "Resolution path defined for stuck cases." },
      ],
      successIndicators: [
        "Sustained drop in documentation alerts",
        "Higher scheme completion ratios per household",
      ],
    },
  ],
  "awareness-campaign": [
    {
      objective: "Design targeted awareness campaigns for underutilized schemes.",
      activities: [
        "Select top underutilized schemes from Command Center analytics",
        "Localize messaging in regional languages",
        "Activate community influencers (ASHA / Anganwadi workers)",
      ],
      stakeholders: ["Information & PR Department", "Community Workers", "Local Media"],
      milestones: [
        { title: "Creatives finalized", detail: "Multilingual scheme creatives ready for distribution." },
        { title: "Channel plan", detail: "Distribution plan across SMS, radio, posters approved." },
      ],
      successIndicators: [
        "Awareness reach (impressions / households contacted)",
        "Inbound enquiries on highlighted schemes",
      ],
    },
    {
      objective: "Scale campaigns based on early signal.",
      activities: [
        "Double-down on channels showing scheme search lift",
        "Run community meetings in underperforming panchayats",
        "Integrate awareness QR codes into the assistant flow",
      ],
      stakeholders: ["Community Workers", "Block Administration"],
      milestones: [
        { title: "High-yield channels", detail: "Most effective channels identified and expanded." },
        { title: "Community meetings", detail: "On-ground meetings completed in priority panchayats." },
      ],
      successIndicators: [
        "Scheme search volume lift",
        "Reduction in low-utilization alerts",
      ],
    },
    {
      objective: "Sustain awareness through evergreen content and feedback.",
      activities: [
        "Publish monthly awareness calendars",
        "Refresh creatives based on assistant query trends",
        "Measure long-term recall via household surveys",
      ],
      stakeholders: ["Information Department", "Research Observatory team"],
      milestones: [
        { title: "Evergreen library", detail: "Reusable creative library maintained." },
        { title: "Recall survey", detail: "Baseline recall measurement completed." },
      ],
      successIndicators: [
        "Sustained utilization uplift across targeted schemes",
        "Improvement in opportunity score for benefiting categories",
      ],
    },
  ],
  "navigator-onboarding": [
    {
      objective: "Drive Welfare Navigator adoption across assessed households.",
      activities: [
        "Identify households without navigator runs from analytics",
        "Promote navigator within the assistant and dashboard",
        "Train CSC operators to co-run navigator with citizens",
      ],
      stakeholders: ["CSC Operators", "Product team", "Field facilitators"],
      milestones: [
        { title: "Adoption baseline", detail: "Current navigator adoption percentage captured." },
        { title: "Operator training", detail: "Operators certified to facilitate navigator runs." },
      ],
      successIndicators: [
        "Navigator runs per assessed household",
        "Schemes explored per household",
      ],
    },
    {
      objective: "Embed navigator into household welfare journeys.",
      activities: [
        "Trigger navigator after every eligibility assessment",
        "Send periodic nudges via the assistant",
        "Surface navigator goal categories on the dashboard",
      ],
      stakeholders: ["Product team", "CSC Network"],
      milestones: [
        { title: "Auto-trigger live", detail: "Navigator suggested by default after assessment." },
        { title: "Nudge cadence", detail: "Reminder cadence finalized and rolled out." },
      ],
      successIndicators: [
        "Navigator adoption percent",
        "Reduction in missed opportunities per household",
      ],
    },
    {
      objective: "Treat navigator as the default welfare planning surface.",
      activities: [
        "Make navigator the primary entry point for assisted CSC sessions",
        "Surface navigator-driven action plans in agent dashboard",
        "Iterate goal categories using research observatory findings",
      ],
      stakeholders: ["CSC Operators", "Product team", "Research Observatory"],
      milestones: [
        { title: "Default surface", detail: "Navigator promoted as default planning view." },
        { title: "Goal expansion", detail: "New goal categories shipped based on observed demand." },
      ],
      successIndicators: [
        "Sustained navigator adoption above 60%",
        "Opportunity score lift across assisted cohort",
      ],
    },
  ],
  "scheme-promotion": [
    {
      objective: "Spotlight high-impact underutilized schemes across surfaces.",
      activities: [
        "Curate top schemes from Command Center underperforming list",
        "Feature them on Schemes page and assistant prompts",
        "Brief CSC operators on the promoted shortlist",
      ],
      stakeholders: ["Content team", "CSC Operators"],
      milestones: [
        { title: "Promotion shortlist", detail: "Final shortlist of promoted schemes published." },
        { title: "Surface integration", detail: "Promotion live across Schemes and Assistant surfaces." },
      ],
      successIndicators: [
        "Views and downloads of promoted schemes",
        "Action plans created for promoted schemes",
      ],
    },
    {
      objective: "Reinforce promotion with operator-led conversion.",
      activities: [
        "Train operators to prioritize promoted schemes during sessions",
        "Add weekly promotion-impact review in agent dashboard",
        "Pair promotion with documentation assistance where needed",
      ],
      stakeholders: ["CSC Operators", "State Welfare Officers"],
      milestones: [
        { title: "Operator playbook", detail: "Promotion talking points distributed to operators." },
        { title: "Review cadence", detail: "Weekly review of promoted-scheme uptake established." },
      ],
      successIndicators: [
        "Conversion rate of promoted schemes",
        "Lift in opportunity score for participating households",
      ],
    },
    {
      objective: "Refresh promotion strategy based on outcomes.",
      activities: [
        "Quarterly refresh of promoted-scheme shortlist",
        "Retire schemes that reach healthy utilization",
        "Replace with next-best opportunity schemes",
      ],
      stakeholders: ["Content team", "Research Observatory"],
      milestones: [
        { title: "Quarterly refresh", detail: "First quarterly refresh executed." },
        { title: "Outcome readout", detail: "Impact published via export center." },
      ],
      successIndicators: [
        "Welfare readiness score uplift",
        "Sustained reduction in underutilized scheme count",
      ],
    },
  ],
};

export function buildRoadmaps(
  interventions: PlannerIntervention[],
): InterventionRoadmap[] {
  return interventions.map((iv) => {
    const tpl = TEMPLATES[iv.kind];
    return {
      interventionId: iv.id,
      phases: [
        { window: "30-day", ...tpl[0] },
        { window: "60-day", ...tpl[1] },
        { window: "90-day", ...tpl[2] },
      ],
    };
  });
}
