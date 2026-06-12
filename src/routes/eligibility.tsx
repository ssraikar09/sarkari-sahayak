import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ExternalLink, Sparkles, UserCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { RecommendationCard } from "@/components/eligibility/RecommendationCard";
import {
  fetchCitizenProfile,
  getStoredProfileId,
} from "@/lib/citizen-profile/storage";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";
import {
  assessProfileEligibility,
  logEligibilityAssessment,
  type EligibilityAssessment,
} from "@/lib/eligibility";

export const Route = createFileRoute("/eligibility")({
  head: () => ({
    meta: [
      { title: "Your Eligible Schemes — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "See government schemes you may qualify for, with transparent explanations of why each one is recommended.",
      },
      {
        property: "og:title",
        content: "Your Eligible Schemes — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Personalised, explainable government scheme recommendations based on your citizen profile.",
      },
    ],
  }),
  component: EligibilityPage,
});

function EligibilityPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [assessment, setAssessment] = useState<EligibilityAssessment | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    const id = getStoredProfileId();
    if (!id) {
      // No profile yet — push the citizen through onboarding first.
      void navigate({ to: "/onboarding" });
      return;
    }

    setLoading(true);
    setError(null);
    (async () => {
      try {
        const p = await fetchCitizenProfile(id);
        if (!active) return;
        if (!p) {
          void navigate({ to: "/onboarding" });
          return;
        }
        setProfile(p);
        const result = await assessProfileEligibility(p);
        if (!active) return;
        setAssessment(result);
        void logEligibilityAssessment(
          p.id,
          result.recommendations.map((r) => r.scheme.id),
        );
      } catch (e) {
        console.error(e);
        if (active) setError("Couldn't generate your recommendations.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  const summary = useMemo(() => {
    if (!assessment) return null;
    const total = assessment.recommendations.length;
    const high = assessment.recommendations.filter(
      (r) => r.confidence === "High Match",
    ).length;
    return { total, high };
  }, [assessment]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-6 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          {profile ? (
            <Button asChild variant="ghost" size="sm">
              <Link to="/profile/$id" params={{ id: profile.id }}>
                <UserCircle2 className="mr-1 size-4" />
                View profile
              </Link>
            </Button>
          ) : null}
        </div>

        <header className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Explainable Eligibility
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Schemes you may qualify for
          </h1>
          {profile ? (
            <p className="mt-2 max-w-2xl text-muted-foreground">
              Personalised for{" "}
              <span className="font-medium text-foreground">
                {profile.full_name}
              </span>{" "}
              · {profile.occupation} · {profile.state}
            </p>
          ) : null}
          {summary ? (
            <p className="mt-1 text-sm text-muted-foreground">
              {summary.total} matching scheme{summary.total === 1 ? "" : "s"}
              {summary.high > 0 ? ` · ${summary.high} High Match` : ""}
            </p>
          ) : null}
        </header>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-72 w-full rounded-2xl" />
            ))}
          </div>
        ) : error ? (
          <ErrorState
            message={error}
            onRetry={() => window.location.reload()}
          />
        ) : assessment && assessment.recommendations.length === 0 ? (
          <EmptyState />
        ) : assessment ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {assessment.recommendations.map((r) => (
              <RecommendationCard key={r.scheme.id} recommendation={r} />
            ))}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function EmptyState() {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm sm:p-10">
      <h2 className="text-lg font-semibold text-foreground sm:text-xl">
        No exact matches just yet
      </h2>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        We could not identify exact scheme matches based on your current
        profile. You can still explore the verified database or check official
        government resources for more options.
      </p>
      <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
        <Button asChild>
          <Link to="/schemes">Browse Schemes</Link>
        </Button>
        <Button asChild variant="outline">
          <a
            href="https://www.myscheme.gov.in/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <ExternalLink className="mr-1 size-4" />
            View Official Resources
          </a>
        </Button>
      </div>
    </div>
  );
}

function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h2 className="text-lg font-semibold text-foreground">
        Something went wrong
      </h2>
      <p className="mt-2 text-sm text-muted-foreground">{message}</p>
      <Button className="mt-5" onClick={onRetry}>
        Try again
      </Button>
    </div>
  );
}
