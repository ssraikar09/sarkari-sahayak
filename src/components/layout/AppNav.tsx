import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FileText,
  MessageCircle,
  Users,
  BarChart3,
  Compass,
  Briefcase,
  Scale,
  Network,
  Map as MapIcon,
  TrendingUp,
  Menu,
  X,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const primary = [
  { to: "/", label: "Home", icon: Home },
  { to: "/schemes", label: "Schemes", icon: FileText },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
  { to: "/family-planner", label: "Family", icon: Users },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { to: "/navigator", label: "Navigator", icon: Compass },
  { to: "/agent-dashboard", label: "CSC", icon: Briefcase },
] as const;

const secondary = [
  { to: "/decision-engine", label: "Decision Engine", icon: Scale },
  { to: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { to: "/welfare-roadmap", label: "Welfare Roadmap", icon: MapIcon },
  { to: "/insights", label: "Research Insights", icon: TrendingUp },
] as const;

export function AppNav() {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [open, setOpen] = useState(false);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-2.5 sm:px-6">
        <Link to="/" className="flex shrink-0 items-center gap-2">
          <div className="grid size-8 place-items-center rounded-lg bg-primary text-primary-foreground">
            <span className="text-sm font-bold">SX</span>
          </div>
          <span className="hidden text-sm font-semibold tracking-tight sm:block">
            Sarkari Sahayak X
          </span>
        </Link>

        <nav className="ml-2 hidden flex-1 items-center gap-0.5 overflow-x-auto md:flex">
          {primary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <Icon className="size-3.5" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-0.5 border-l border-border/60 pl-2 lg:flex">
          {secondary.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.to);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium transition-colors",
                  active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
                title={item.label}
              >
                <Icon className="size-3.5" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            );
          })}
        </div>

        <button
          type="button"
          aria-label="Toggle navigation"
          onClick={() => setOpen((v) => !v)}
          className="ml-auto inline-flex size-9 items-center justify-center rounded-md border border-input md:hidden"
        >
          {open ? <X className="size-4" /> : <Menu className="size-4" />}
        </button>
      </div>

      {open ? (
        <div className="border-t border-border/60 bg-background md:hidden">
          <div className="mx-auto grid max-w-7xl grid-cols-2 gap-1 px-4 py-3">
            {[...primary, ...secondary].map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => setOpen(false)}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium",
                    active
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-accent",
                  )}
                >
                  <Icon className="size-4" />
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      ) : null}
    </header>
  );
}
