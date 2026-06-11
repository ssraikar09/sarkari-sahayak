import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Separator } from "@/components/ui/separator";
import {
  ArrowLeft,
  Calendar,
  CheckCircle2,
  ClipboardList,
  Clock,
  ExternalLink,
  FileText,
  Gift,
  MapPin,
  Phone,
  Tag,
} from "lucide-react";
import {
  getSchemeById,
  SchemeFallback,
  type GovernmentScheme,
} from "@/lib/schemes";

export const Route = createFileRoute("/schemes/$id")({
  head: () => ({
    meta: [
      { title: "Scheme details — Sarkari Sahayak X" },
      {
        name: "description",
        content: "Full eligibility, benefits and documentation for this government scheme.",
      },
    ],
  }),
  component: SchemeDetails,
});

function SchemeDetails() {
  const { id } = Route.useParams();
  const [scheme, setScheme] = useState<GovernmentScheme | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);
    getSchemeById(id)
      .then((s) => {
        if (!active) return;
        if (!s) setError("Scheme not found.");
        setScheme(s);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError("Could not load scheme.");
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [id]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-3xl">
        <div className="mb-6">
          <Button asChild variant="ghost" size="sm">
            <Link to="/schemes">
              <ArrowLeft className="mr-1 size-4" />
              Back to schemes
            </Link>
          </Button>
        </div>

        {loading ? (
          <div className="space-y-4 rounded-2xl border bg-card p-6 sm:p-8">
            <Skeleton className="h-8 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
            <Skeleton className="h-24 w-full" />
            <Skeleton className="h-24 w-full" />
          </div>
        ) : error || !scheme ? (
          <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
            <h1 className="text-xl font-semibold text-foreground">
              {error ?? "Scheme not found"}
            </h1>
            <Button asChild className="mt-5">
              <Link to="/schemes">Browse all schemes</Link>
            </Button>
          </div>
        ) : (
          <article className="overflow-hidden rounded-3xl border bg-card shadow-sm">
            <div className="bg-gradient-to-br from-primary to-primary/70 p-6 text-primary-foreground sm:p-8">
              <div className="flex flex-wrap gap-2">
                <Badge variant="secondary" className="gap-1 text-foreground">
                  <Tag className="size-3" />
                  {scheme.category}
                </Badge>
                <Badge variant="secondary" className="gap-1 text-foreground">
                  <MapPin className="size-3" />
                  {scheme.scheme_scope === "National"
                    ? "National Scheme"
                    : `State Scheme · ${scheme.state}`}
                </Badge>
              </div>
              <h1 className="mt-3 text-2xl font-bold sm:text-3xl">{scheme.scheme_name}</h1>
              <p className="mt-3 text-sm leading-relaxed opacity-95">{scheme.description}</p>
            </div>

            <div className="space-y-6 p-6 sm:p-8">
              <Section
                icon={<CheckCircle2 className="size-4" />}
                title="Eligibility criteria"
                content={scheme.eligibility_criteria}
              />
              <Separator />
              <Section
                icon={<Gift className="size-4" />}
                title="Benefits"
                content={scheme.benefits}
              />
              <Separator />
              <Section
                icon={<FileText className="size-4" />}
                title="Required documents"
                content={scheme.required_documents}
              />
              {scheme.application_process ? (
                <>
                  <Separator />
                  <Section
                    icon={<ClipboardList className="size-4" />}
                    title="How to apply"
                    content={scheme.application_process}
                  />
                </>
              ) : null}
              {scheme.important_dates ? (
                <>
                  <Separator />
                  <Section
                    icon={<Clock className="size-4" />}
                    title="Important dates"
                    content={scheme.important_dates}
                  />
                </>
              ) : null}
              {scheme.contact_info ? (
                <>
                  <Separator />
                  <Section
                    icon={<Phone className="size-4" />}
                    title="Contact & helpline"
                    content={scheme.contact_info}
                  />
                </>
              ) : null}

              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-accent/40 p-4">
                <span className="inline-flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="size-4" />
                  Last updated{" "}
                  {new Date(scheme.last_updated).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
                {scheme.official_link ? (
                  <Button asChild>
                    <a href={scheme.official_link} target="_blank" rel="noopener noreferrer">
                      Official link
                      <ExternalLink className="ml-1 size-4" />
                    </a>
                  </Button>
                ) : null}
              </div>
            </div>
          </article>
        )}
      </div>
    </main>
  );
}

function Section({
  icon,
  title,
  content,
}: {
  icon: React.ReactNode;
  title: string;
  content: string;
}) {
  return (
    <section>
      <h2 className="flex items-center gap-2 text-base font-semibold text-foreground">
        <span className="flex size-7 items-center justify-center rounded-md bg-primary/10 text-primary">
          {icon}
        </span>
        {title}
      </h2>
      <p className="mt-2 whitespace-pre-line text-sm leading-relaxed text-muted-foreground">
        {content}
      </p>
    </section>
  );
}
