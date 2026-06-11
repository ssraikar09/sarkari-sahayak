import { Link } from "@tanstack/react-router";
import { ArrowRight, Check, ClipboardCheck, MapPin, ShieldCheck, Tag, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  getConfidenceTone,
  type EligibilityRecommendation,
} from "@/lib/eligibility";

export function RecommendationCard({
  recommendation,
  applyLabel = "View Application Guide",
}: {
  recommendation: EligibilityRecommendation;
  applyLabel?: string;
}) {
  const { scheme, confidence, matchedCount, totalApplicable, reasons } =
    recommendation;
  const tone = getConfidenceTone(confidence);
  const isNational = scheme.scheme_scope === "National";

  return (
    <article className="flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={cn(
            "gap-1",
            isNational
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-accent text-accent-foreground hover:bg-accent/80",
          )}
        >
          <MapPin className="size-3" />
          {isNational ? "National Scheme" : "State Scheme"}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Tag className="size-3" />
          {scheme.category}
        </Badge>
        <ConfidenceBadge tone={tone} label={confidence} />
      </div>

      <h3 className="mt-3 text-lg font-semibold text-foreground sm:text-xl">
        {scheme.scheme_name}
      </h3>
      <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">
        {scheme.description}
      </p>

      <div className="mt-4 rounded-xl border bg-background/60 p-4">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <ShieldCheck className="size-4 text-primary" aria-hidden />
          Why am I eligible?
          <span className="ml-auto text-xs font-normal text-muted-foreground">
            {matchedCount}/{totalApplicable} criteria matched
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {reasons.map((r) => (
            <li
              key={r.criterion}
              className="flex items-start gap-2 text-sm leading-snug"
            >
              {r.matched ? (
                <Check
                  className="mt-0.5 size-4 shrink-0 text-emerald-600"
                  aria-hidden
                />
              ) : (
                <X
                  className="mt-0.5 size-4 shrink-0 text-muted-foreground"
                  aria-hidden
                />
              )}
              <span
                className={
                  r.matched ? "text-foreground" : "text-muted-foreground"
                }
              >
                {r.reason}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-5 flex items-center justify-end">
        <Button asChild size="sm">
          <Link to="/schemes/$id" params={{ id: scheme.id }}>
            View Details
            <ArrowRight className="ml-1 size-4" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function ConfidenceBadge({
  tone,
  label,
}: {
  tone: "success" | "warning" | "muted";
  label: string;
}) {
  const cls =
    tone === "success"
      ? "bg-emerald-100 text-emerald-800 hover:bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-200"
      : tone === "warning"
        ? "bg-amber-100 text-amber-900 hover:bg-amber-100 dark:bg-amber-900/40 dark:text-amber-200"
        : "bg-muted text-muted-foreground hover:bg-muted";
  return <Badge className={cn("gap-1 border-0", cls)}>{label}</Badge>;
}
