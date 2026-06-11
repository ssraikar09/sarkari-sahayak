import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Briefcase,
  CheckCircle2,
  Languages,
  MapPin,
  Sparkles,
  User2,
  Users,
} from "lucide-react";
import { fetchCitizenProfile } from "@/lib/citizen-profile/storage";
import type { CitizenProfile } from "@/lib/citizen-profile/constants";

export const Route = createFileRoute("/profile/$id")({
  head: () => ({
    meta: [
      { title: "Your Citizen Profile — Sarkari Sahayak X" },
      {
        name: "description",
        content: "Your Citizen Digital Twin profile, ready for AI-powered scheme matching.",
      },
    ],
  }),
  component: ProfilePage,
});

function ProfilePage() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchCitizenProfile(id)
      .then((p) => {
        if (!active) return;
        if (!p) setError("Profile not found.");
        setProfile(p);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError("Could not load profile.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-2xl">
        {loading ? (
          <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-3 h-10 w-64" />
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-20 w-full" />
              ))}
            </div>
          </div>
        ) : error || !profile ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">{error ?? "Profile not found"}</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Let's create your profile so we can match you with the right schemes.
            </p>
            <Button asChild className="mt-5" size="lg">
              <Link to="/onboarding">Start onboarding</Link>
            </Button>
          </div>
        ) : (
          <>
            <div className="mb-6 flex items-center gap-2 text-sm font-medium text-primary">
              <CheckCircle2 className="size-4" />
              Profile created successfully
            </div>

            <div className="overflow-hidden rounded-3xl border bg-card shadow-sm">
              <div className="relative bg-gradient-to-br from-primary to-primary/70 px-6 py-8 text-primary-foreground sm:px-8">
                <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wider opacity-80">
                  <Sparkles className="size-3.5" />
                  Citizen Digital Twin
                </div>
                <h1 className="mt-2 text-3xl font-bold sm:text-4xl">{profile.full_name}</h1>
                <p className="mt-1 text-sm opacity-90">
                  {profile.occupation} · {profile.state}
                </p>
              </div>

              <div className="grid gap-4 p-6 sm:grid-cols-2 sm:p-8">
                <Stat icon={<User2 className="size-4" />} label="Name" value={profile.full_name} />
                <Stat icon={<MapPin className="size-4" />} label="State" value={profile.state} />
                <Stat
                  icon={<Briefcase className="size-4" />}
                  label="Occupation"
                  value={profile.occupation}
                />
                <Stat
                  icon={<Languages className="size-4" />}
                  label="Preferred language"
                  value={profile.preferred_language}
                />
                <Stat
                  icon={<Users className="size-4" />}
                  label="Family size"
                  value={`${profile.family_members} members`}
                />
                <Stat
                  icon={<Sparkles className="size-4" />}
                  label="Income bracket"
                  value={profile.annual_income}
                />
              </div>

              <div className="border-t bg-accent/40 px-6 py-5 text-center text-sm font-medium text-foreground sm:px-8">
                Your profile is ready for AI-powered eligibility assessment.
              </div>
            </div>

            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Button variant="outline" size="lg" onClick={() => navigate({ to: "/" })}>
                Back to home
              </Button>
              <Button size="lg" disabled title="Coming in Module 2">
                Check eligibility (coming soon)
              </Button>
            </div>
          </>
        )}
      </div>
    </main>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border bg-background p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className="mt-1.5 text-base font-semibold text-foreground">{value}</div>
    </div>
  );
}
