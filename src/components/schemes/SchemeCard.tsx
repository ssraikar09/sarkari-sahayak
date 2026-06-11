import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar, MapPin, Tag } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { GovernmentScheme } from "@/lib/schemes";

export function SchemeCard({ scheme }: { scheme: GovernmentScheme }) {
  const isNational = scheme.scheme_scope === "National";
  return (
    <article className="group flex flex-col rounded-2xl border bg-card p-5 shadow-sm transition hover:border-primary/40 hover:shadow-md">
      <div className="flex flex-wrap items-center gap-2">
        <Badge
          className={
            isNational
              ? "gap-1 bg-primary text-primary-foreground hover:bg-primary/90"
              : "gap-1 bg-accent text-accent-foreground hover:bg-accent/80"
          }
        >
          <MapPin className="size-3" />
          {isNational ? "National Scheme" : "State Scheme"}
        </Badge>
        <Badge variant="secondary" className="gap-1">
          <Tag className="size-3" />
          {scheme.category}
        </Badge>
        {!isNational ? (
          <Badge variant="outline" className="gap-1">
            <MapPin className="size-3" />
            {scheme.state}
          </Badge>
        ) : null}
      </div>

      <h3 className="mt-3 line-clamp-2 text-lg font-semibold text-foreground">
        {scheme.scheme_name}
      </h3>
      <p className="mt-2 line-clamp-3 flex-1 text-sm text-muted-foreground">
        {scheme.description}
      </p>

      <div className="mt-4 flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
          <Calendar className="size-3" />
          Updated {new Date(scheme.last_updated).toLocaleDateString("en-IN")}
        </span>
        <Button asChild size="sm" variant="ghost" className="gap-1 group-hover:text-primary">
          <Link to="/schemes/$id" params={{ id: scheme.id }}>
            View Details
            <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}
