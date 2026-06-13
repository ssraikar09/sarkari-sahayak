import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Sparkles,
  ShieldCheck,
  Languages,
  MessageCircle,
  Users,
  Compass,
  TrendingUp,
  Briefcase,
  Scale,
  Network,
  Map as MapIcon,
  CheckCircle2,
  FileText,
  ArrowRight,
  Database,
  Cpu,
  Globe2,
  Lock,
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
  const { data: schemeCount } = useQuery({
    queryKey: ["schemes-count"],
    queryFn: async () => {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const { count } = await (supabase as any)
        .from("government_schemes")
        .select("*", { count: "exact", head: true });
      return (count as number | null) ?? null;
    },
    staleTime: 5 * 60 * 1000,
  });
  const displayCount = schemeCount ? `${schemeCount}+` : "150+";
  return (
    <div className="bg-gradient-to-b from-background via-background to-accent/40">
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 -z-10 [background:radial-gradient(70%_55%_at_50%_0%,oklch(0.68_0.18_45/0.14),transparent_70%)]" />
        <div className="absolute inset-0 -z-10 [background:radial-gradient(60%_50%_at_85%_30%,oklch(0.62_0.16_150/0.10),transparent_70%)]" />
        <div className="mx-auto max-w-6xl px-6 py-16 sm:py-24">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex animate-fade-in items-center gap-2 rounded-full border border-primary/30 bg-card/70 px-4 py-1.5 text-xs font-semibold text-primary shadow-sm backdrop-blur">
              <Sparkles className="size-3.5" />
              AI-Powered Government Scheme Navigator
              <ArrowRight className="size-3.5" />
            </div>
            <h1
              lang="hi"
              style={{ fontFamily: '"Noto Sans Devanagari", "Tiro Devanagari Hindi", system-ui, sans-serif' }}
              className="mt-7 animate-fade-in bg-gradient-to-r from-primary via-amber-500 to-secondary bg-clip-text pb-2 text-5xl font-extrabold leading-[1.15] tracking-tight text-transparent drop-shadow-sm sm:text-7xl lg:text-8xl"
            >
              सरकारी सहायक
            </h1>
            <p className="mt-6 animate-fade-in text-balance text-xl font-semibold text-foreground sm:text-2xl">
              Transforming Welfare Access into Welfare Intelligence
            </p>
            <p className="mx-auto mt-4 max-w-2xl animate-fade-in text-balance text-base text-muted-foreground sm:text-lg">
              One platform to discover, check eligibility, and apply for{" "}
              <span className="font-bold text-primary">{displayCount} government schemes</span>
              {" "}— in your own language.
            </p>
            <div className="mt-10 flex animate-fade-in flex-wrap items-center justify-center gap-3">
              <Link
                to="/eligibility"
                className="group inline-flex h-12 items-center justify-center rounded-full bg-gradient-to-r from-primary to-amber-500 px-8 text-sm font-semibold text-primary-foreground shadow-lg shadow-primary/25 transition-all duration-200 hover:scale-[1.03] hover:shadow-xl hover:shadow-primary/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
              >
                <CheckCircle2 className="mr-2 size-4" />
                Check Your Eligibility
                <ArrowRight className="ml-2 size-4 transition-transform group-hover:translate-x-0.5" />
              </Link>
              <Link
                to="/assistant"
                className="inline-flex h-12 items-center justify-center rounded-full border-2 border-secondary/50 bg-background px-8 text-sm font-semibold text-foreground transition-all duration-200 hover:scale-[1.03] hover:border-secondary hover:bg-secondary/5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2"
              >
                <MessageCircle className="mr-2 size-4 text-secondary" />
                Ask AI Assistant
              </Link>
            </div>
          </div>

          {/* Stats strip */}
          <div className="mx-auto mt-14 grid max-w-5xl animate-fade-in grid-cols-2 gap-3 sm:grid-cols-4">
            <StatCard icon={Database} value={displayCount} label="Government Schemes" />
            <StatCard icon={Languages} value="6" label="Languages Supported" />
            <StatCard icon={Cpu} value="25" label="Intelligent Modules" />
            <StatCard icon={Sparkles} value="AI" label="Welfare Intelligence" />
          </div>

          <div className="mx-auto mt-10 grid max-w-4xl animate-fade-in gap-3 sm:grid-cols-3">
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

        {/* Trust Indicators */}
        <section>
          <div className="mb-5 flex flex-col gap-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-secondary">
              Trust
            </span>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">
              Built on Trustworthy Foundations
            </h2>
            <p className="text-sm text-muted-foreground">
              Every recommendation traces back to a verified source.
            </p>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <TrustBadge icon={ShieldCheck} title="Verified Government Sources" desc="Grounded in official scheme records." />
            <TrustBadge icon={Globe2} title="Multilingual Support" desc="Six Indian languages, end-to-end." />
            <TrustBadge icon={Sparkles} title="AI-Assisted Guidance" desc="Explainable, citation-backed answers." />
            <TrustBadge icon={Lock} title="Privacy-Aware Design" desc="Profiles stay scoped to your session." />
          </div>
        </section>

        <div className="rounded-2xl border bg-card p-6 text-center shadow-sm transition-shadow hover:shadow-md sm:p-8">
          <FileText className="mx-auto size-6 text-primary" />
          <h3 className="mt-3 text-lg font-semibold">Need to apply for a scheme?</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Step-by-step application guidance with verified official links.
          </p>
          <Link
            to="/application-guide"
            search={{ schemeId: undefined }}
            className="mt-4 inline-flex h-10 items-center justify-center rounded-md border border-input bg-background px-5 text-sm font-medium transition-all hover:scale-[1.02] hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
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
      className="group relative flex h-full min-h-[180px] flex-col rounded-2xl border bg-card p-5 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-primary/40 hover:shadow-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
    >
      <div className="flex size-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-6" />
      </div>
      <h3 className="mt-4 text-base font-semibold tracking-tight text-foreground">
        {item.title}
      </h3>
      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
        {item.desc}
      </p>
      <span className="mt-auto inline-flex items-center gap-1 pt-4 text-sm font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
        Open
        <ArrowRight className="size-3.5" />
      </span>
    </Link>
  );
}

function Feature({ icon: Icon, title, desc }: { icon: LucideIcon; title: string; desc: string }) {
  return (
    <div className="rounded-xl border bg-card p-4 text-left shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
        <Icon className="size-4" />
      </div>
      <h3 className="mt-3 text-sm font-semibold text-foreground">{title}</h3>
      <p className="mt-0.5 text-xs text-muted-foreground">{desc}</p>
    </div>
  );
}

function StatCard({
  icon: Icon,
  value,
  label,
}: {
  icon: LucideIcon;
  value: string;
  label: string;
}) {
  return (
    <div className="group rounded-2xl border bg-card/80 p-4 text-center shadow-sm backdrop-blur transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md">
      <div className="mx-auto flex size-9 items-center justify-center rounded-lg bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="mt-2 text-2xl font-extrabold tracking-tight text-foreground sm:text-3xl">
        {value}
      </div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}

function TrustBadge({
  icon: Icon,
  title,
  desc,
}: {
  icon: LucideIcon;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 rounded-xl border bg-card p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-secondary/40 hover:shadow-md">
      <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-secondary/10 text-secondary">
        <Icon className="size-4" aria-hidden />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-semibold text-foreground">{title}</h3>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          {desc}
        </p>
      </div>
    </div>
  );
}
