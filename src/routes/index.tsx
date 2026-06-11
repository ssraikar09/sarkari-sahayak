import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Sparkles, ShieldCheck, Languages, MessageCircle, Users, BarChart3, Compass } from "lucide-react";

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

function Welcome() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-gradient-to-br from-background via-background to-accent/40">
      <div className="absolute inset-0 -z-10 opacity-60 [background:radial-gradient(60%_50%_at_50%_0%,hsl(var(--primary)/0.15),transparent_70%)]" />
      <div className="mx-auto flex min-h-screen max-w-4xl flex-col items-center justify-center px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
          <Sparkles className="size-3.5" />
          Module 1 · Citizen Digital Twin
        </div>

        <h1 className="mt-6 text-balance text-4xl font-bold tracking-tight text-foreground sm:text-6xl">
          Welcome to <span className="text-primary">Sarkari Sahayak X</span>
        </h1>
        <p className="mt-5 max-w-2xl text-balance text-lg text-muted-foreground sm:text-xl">
          Your AI-powered government scheme assistant.
        </p>

        <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
          <Button asChild size="lg" className="h-14 px-10 text-base">
            <Link to="/onboarding">Get Started</Link>
          </Button>
          <Button asChild size="lg" variant="secondary" className="h-14 px-8 text-base">
            <Link to="/eligibility">Check My Eligibility</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/assistant">
              <MessageCircle className="mr-1 size-4" />
              Ask the Assistant
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/family-planner">
              <Users className="mr-1 size-4" />
              Family Planner
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/application-guide" search={{ schemeId: undefined }}>
              How to Apply
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/schemes">Browse Schemes</Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/dashboard">
              <BarChart3 className="mr-1 size-4" />
              Impact Dashboard
            </Link>
          </Button>
          <Button asChild size="lg" variant="outline" className="h-14 px-8 text-base">
            <Link to="/navigator">
              <Compass className="mr-1 size-4" />
              Welfare Navigator
            </Link>
          </Button>
        </div>

        <div className="mt-16 grid w-full gap-4 sm:grid-cols-3">
          <FeatureCard
            icon={<ShieldCheck className="size-5" />}
            title="Personalized"
            desc="Schemes matched to your profile, family and income."
          />
          <FeatureCard
            icon={<Sparkles className="size-5" />}
            title="AI-powered"
            desc="Smart eligibility checks across hundreds of programs."
          />
          <FeatureCard
            icon={<Languages className="size-5" />}
            title="Your language"
            desc="English, Hindi, Kannada, Marathi and Tamil."
          />
        </div>
      </div>
    </main>
  );
}

function FeatureCard({
  icon,
  title,
  desc,
}: {
  icon: React.ReactNode;
  title: string;
  desc: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 text-left shadow-sm">
      <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
        {icon}
      </div>
      <h3 className="mt-3 font-semibold text-foreground">{title}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{desc}</p>
    </div>
  );
}
