import { ExternalLink, Info, Landmark, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  NATIONAL_RESOURCES,
  STATE_RESOURCES,
  getStateResource,
  type OfficialResource,
} from "@/lib/schemes/officialSources";

export type SchemeFallbackProps = {
  /** The query the user searched for (shown back to them). */
  searchQuery?: string;
  /** Optional state filter the user had selected. */
  stateSelected?: string | null;
  /** Optional className for layout overrides. */
  className?: string;
};

/**
 * Friendly fallback shown when a scheme is not present in the verified
 * Sarkari Sahayak database. Guides citizens to official government sources.
 *
 * Reusable: future modules (Hybrid RAG, Agentic CSC Assistant) can render
 * this component to surface the same trusted guidance.
 */
export function SchemeFallback({
  searchQuery,
  stateSelected,
  className,
}: SchemeFallbackProps) {
  const stateResource = getStateResource(stateSelected);
  const stateResources: OfficialResource[] = stateResource
    ? [stateResource]
    : Object.values(STATE_RESOURCES);

  const primary = stateResource ?? NATIONAL_RESOURCES[0];

  return (
    <section
      aria-labelledby="scheme-fallback-title"
      className={
        "rounded-2xl border bg-card p-5 shadow-sm sm:p-7 " + (className ?? "")
      }
    >
      <div className="flex items-start gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Info className="size-5" aria-hidden />
        </div>
        <div className="min-w-0">
          <h2
            id="scheme-fallback-title"
            className="text-lg font-semibold text-foreground sm:text-xl"
          >
            Scheme not found in verified database
          </h2>
          {searchQuery ? (
            <p className="mt-1 text-sm text-muted-foreground">
              We couldn't find{" "}
              <span className="font-medium text-foreground">
                "{searchQuery}"
              </span>{" "}
              in Sarkari Sahayak's verified knowledge base.
            </p>
          ) : null}
          <p className="mt-3 text-sm leading-relaxed text-foreground/90">
            This scheme is currently not available in Sarkari Sahayak's verified
            knowledge base. To ensure citizens receive accurate information,
            please refer to the official government sources below.
          </p>

          <div className="mt-4">
            <Button asChild size="lg" className="w-full sm:w-auto">
              <a
                href={primary.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Search Official Sources — opens ${primary.name} in a new tab`}
              >
                <ExternalLink className="mr-2 size-4" />
                Search Official Sources
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-2">
        <ResourceList
          icon={<Landmark className="size-4" aria-hidden />}
          title="National Resources"
          resources={NATIONAL_RESOURCES}
        />
        <ResourceList
          icon={<MapPin className="size-4" aria-hidden />}
          title={
            stateResource
              ? `${stateSelected} Resources`
              : "State Resources"
          }
          resources={stateResources}
        />
      </div>
    </section>
  );
}

function ResourceList({
  icon,
  title,
  resources,
}: {
  icon: React.ReactNode;
  title: string;
  resources: OfficialResource[];
}) {
  return (
    <div className="rounded-xl border bg-background/60 p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-foreground">
        <span className="text-primary">{icon}</span>
        {title}
      </div>
      <ul className="space-y-3">
        {resources.map((r) => (
          <li key={r.url}>
            <a
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              className="group block rounded-lg p-2 -mx-2 transition hover:bg-accent focus-visible:bg-accent focus-visible:outline-none"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-foreground group-hover:text-primary">
                  {r.name}
                </span>
                <ExternalLink className="size-3.5 text-muted-foreground" aria-hidden />
              </div>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {r.description}
              </p>
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
