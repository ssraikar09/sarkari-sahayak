import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles,
  ShieldCheck,
  Languages,
  MessageCircle,
  Users,
  BarChart3,
  Compass,
  TrendingUp,
  Briefcase,
  Scale,
  Network,
  Map as MapIcon,
  UserPlus,
  CheckCircle2,
  FileText,
  ArrowRight,
  type LucideIcon,
} from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sarkari Sahayak X — AI Government Scheme Assistant" },
      {
        name: "description",
        content:
          "Discover government schemes you're eligible for. Personalized, AI-powered, in your language.",
      },
      { property: "og:title", content: "Sarkari Sahayak X" },
      {
        property: "og:description",
        content: "Your AI-powered government scheme assistant.",
      },
    ],
  }),
  component: Welcome,
});

type CardItem = {
  to: string;
  icon: LucideIcon;
  title: string;
  desc: string;
  search?: Record<string, unknown>;
};

const sectionA: CardItem[] = [
  { to: "/assistant", icon: MessageCircle, title: "Ask Assistant", desc: "AI answers grounded in official sources." },
  { to: "/eligibility", icon: CheckCircle2, title: "Check Eligibility", desc: "See schemes matched to your profile." },
  { to: "/schemes", icon: FileText, title: "Explore Schemes", desc: "Browse all government welfare programs." },
];

const sectionB: CardItem[] = [
  { to: "/family-planner", icon: Users, title: "Family Planner", desc: "Plan welfare for every household member." },
  { to: "/navigator", icon: Compass, title: "Welfare Navigator", desc: "Turn life goals into action plans." },
  { to: "/welfare-roadmap", icon: MapIcon, title: "Welfare Roadmap", desc: "Project your 5-year welfare journey." },
];

const sectionC: CardItem[] = [
  { to: "/decision-engine", icon: Scale, title: "Decision Engine", desc: "Transparent, explainable AI decisions." },
  { to: "/knowledge-graph", icon: Network, title: "Knowledge Graph", desc: "Visualize the welfare relationship map." },
  { to: "/insights", icon: TrendingUp, title: "Research Insights", desc: "Aggregate, exportable welfare analytics." },
];

const sectionD: CardItem[] = [
  { to: "/agent-dashboard", icon: Briefcase, title: "CSC Dashboard", desc: "Assist multiple citizens efficiently." },
];

function Welcome() {
  return (
    <div className="bg-gradient-to-b from-background via-background to-accent/20">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.10),transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-20">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="size-3.5" />
              Government-grade AI Welfare Platform
            </div>
            <h1 className="mt-5 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              Welcome to <span className="text-primary">Sarkari Sahayak X</span>
            </h1>
            <p className="mt-4 text-balance text-base text-muted-foreground sm:text-lg">
              Discover, plan, and act on the welfare schemes you're eligible for —
              personalized, explainable, and in your language.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/onboarding"
                className="inline-flex h-11 items-center justify-center rounded-md bg-primary px-6 text-sm font-medium text-primary-foreground shadow transition hover:bg-primary/90"
              >
                Get Started
                <ArrowRight className="ml-1.5 size-4" />
              </Link>
              <Link
                to="/eligibility"
                className="inline-flex h-11 items-center justify-center rounded-md border border-input bg-background px-6 text-sm font-medium hover:bg-accent"
              >
                Check My Eligibility
              </Link>
            </div>
          </div>

          <div className="mx-auto mt-12 grid max-w-4xl gap-3 sm:grid-cols-3">
            <Feature icon={ShieldCheck} title="Personalized" desc="Matched to your profile, family and income." />
            <Feature icon={Sparkles} title="AI-powered" desc="Smart eligibility across hundreds of programs." />
            <Feature icon={Languages} title="Your language" desc="English, Hindi, Kannada, Marathi, Tamil." />
          </div>
        </div>
      </section>

      {/* Sections */}
      <div className="mx-auto max-w-6xl space-y-12 px-6 py-14">
        <Section
          eyebrow="Step 1"
          title="Continue Your Welfare Journey"
          desc="Pick up where you left off — discover and act on schemes built for you."
          items={sectionA}
        />
        <Section
          eyebrow="Step 2"
          title="Family Welfare"
          desc="Coordinate welfare across every household member."
          items={sectionB}
        />
        <Section
          eyebrow="Intelligence"
          title="Advanced Intelligence"
          desc="Research-grade analytics and explainable AI."
          items={sectionC}
        />
        <Section
          eyebrow="Operators"
          title="CSC Operations"
          desc="Tools for Common Service Center agents at scale."
          items={sectionD}
        />

        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm sm:p-8">
          <FileText className="mx-auto size-6 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">Need to apply for a scheme?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Step-by-step application guidance with verified official links.
          </p>
          <Link
            to="/application-guide"
            search={{ schemeId: undefined }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium hover:bg-accent"
          >
            Open Application Guide
            <ArrowRight className="ml-1.5 size-4" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function Section({
  eyebrow,
  title,
  desc,
  items,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  items: CardItem[];
}) {
  return (
    <section>
      <div className="mb-5 flex flex-col gap-1">
        <span className="text-xs font-semibold uppercase tracking-wider text-primary">
          {eyebrow}
        </span>
        <h2 className="text-2xl font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-sm text-muted-foreground">{desc}</p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {items.map((item) => (
          <ActionCard key={item.to} item={item} />
        ))}
      </div>
    </section>
  );
}

function ActionCard({ item }: { item: CardItem }) {
  const Icon = item.icon;
  return (
    <Link
      to={item.to}
      className="group relative flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex size-11 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-5" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{item.title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{item.desc}</p>
      <span className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left shadow-sm">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}
