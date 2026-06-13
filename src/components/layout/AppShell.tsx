import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home,
  FileText,
  MessageCircle,
  CheckCircle2,
  Users,
  Compass,
  BarChart3,
  TrendingUp,
  Scale,
  Network,
  Map as MapIcon,
  Briefcase,
  Menu,
  X,
  Moon,
  Sun,
  ChevronDown,
  ShieldCheck,
  Sparkles,
  Atom,
  Siren,
  Microscope,
  Workflow,
  WifiOff,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };

const primary: NavItem[] = [
  { to: "/", label: "Home", icon: Home },
  { to: "/schemes", label: "Schemes", icon: FileText },
  { to: "/eligibility", label: "Eligibility", icon: CheckCircle2 },
  { to: "/assistant", label: "Assistant", icon: MessageCircle },
  { to: "/family-planner", label: "Family", icon: Users },
  { to: "/dashboard", label: "Dashboard", icon: BarChart3 },
];

const more: NavItem[] = [
  { to: "/navigator", label: "Welfare Navigator", icon: Compass },
  { to: "/welfare-roadmap", label: "Welfare Roadmap", icon: MapIcon },
  { to: "/decision-engine", label: "Decision Engine", icon: Scale },
  { to: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
  { to: "/insights", label: "Research Insights", icon: TrendingUp },
  { to: "/policy-intelligence", label: "Policy Intelligence", icon: ShieldCheck },
  { to: "/outcome-prediction", label: "Outcome Prediction", icon: Sparkles },
  { to: "/digital-twin", label: "Digital Twin", icon: Atom },
  { to: "/command-center", label: "Command Center", icon: Siren },
  { to: "/intervention-planner", label: "Intervention Planner", icon: Workflow },
  { to: "/research-observatory", label: "Research Observatory", icon: Microscope },
  { to: "/offline-assistance", label: "Offline Assistance", icon: WifiOff },
  { to: "/agent-dashboard", label: "CSC Dashboard", icon: Briefcase },
];

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileOpen, setMobileOpen] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);
  const [dark, setDark] = useState(false);
  const moreRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setMobileOpen(false);
    setMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const root = document.documentElement;
    if (dark) root.classList.add("dark");
    else root.classList.remove("dark");
  }, [dark]);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (moreRef.current && !moreRef.current.contains(e.target as Node)) {
        setMoreOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const anyMoreActive = more.some((i) => isActive(i.to));

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link to="/" className="flex shrink-0 items-center gap-2.5">
            <div className="grid size-10 place-items-center rounded-xl bg-gradient-to-br from-primary to-secondary text-primary-foreground shadow-sm ring-1 ring-primary/20">
              <ShieldCheck className="size-5" />
            </div>
            <div className="hidden min-w-0 sm:block">
              <div className="truncate text-[15px] font-bold leading-tight tracking-tight">
                Sarkari Sahayak
              </div>
              <div className="truncate text-[11px] leading-tight text-muted-foreground">
                सरकारी सहायक
              </div>
            </div>
          </Link>

          <nav className="ml-auto hidden items-center gap-1 md:flex">
            {primary.map((item) => {
              const active = isActive(item.to);
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={cn(
                    "rounded-full px-3.5 py-2 text-sm font-semibold transition-all",
                    active
                      ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm"
                      : "text-foreground/70 hover:bg-accent hover:text-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}

            <div className="relative" ref={moreRef}>
              <button
                type="button"
                onClick={() => setMoreOpen((v) => !v)}
                className={cn(
                  "inline-flex items-center gap-1 rounded-full px-3.5 py-2 text-sm font-semibold transition-all",
                  anyMoreActive
                    ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-sm"
                    : "text-foreground/70 hover:bg-accent hover:text-foreground",
                )}
              >
                More
                <ChevronDown
                  className={cn(
                    "size-3.5 transition-transform",
                    moreOpen && "rotate-180",
                  )}
                />
              </button>
              {moreOpen && (
                <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-xl border border-border/70 bg-popover p-1.5 shadow-xl">
                  {more.map((item) => {
                    const Icon = item.icon;
                    const active = isActive(item.to);
                    return (
                      <Link
                        key={item.to}
                        to={item.to}
                        className={cn(
                          "flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium",
                          active
                            ? "bg-primary/10 text-primary"
                            : "text-foreground/80 hover:bg-accent",
                        )}
                      >
                        <Icon className="size-4" />
                        {item.label}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </nav>

          <div className="ml-auto flex items-center gap-1 md:ml-2">
            <button
              type="button"
              onClick={() => setDark((v) => !v)}
              aria-label="Toggle theme"
              className="inline-flex size-10 items-center justify-center rounded-full text-foreground/70 hover:bg-accent hover:text-foreground"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="inline-flex size-10 items-center justify-center rounded-full border border-input md:hidden"
            >
              <Menu className="size-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 right-0 flex w-72 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-4 py-3">
              <div className="text-sm font-bold">Menu</div>
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-9 place-items-center rounded-md hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <nav className="flex-1 overflow-y-auto p-2">
              {[...primary, ...more].map((item) => {
                const Icon = item.icon;
                const active = isActive(item.to);
                return (
                  <Link
                    key={item.to}
                    to={item.to}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium",
                      active
                        ? "bg-gradient-to-r from-primary to-secondary text-primary-foreground"
                        : "text-foreground/80 hover:bg-accent",
                    )}
                  >
                    <Icon className="size-4" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </aside>
        </div>
      )}

      <main className="flex-1">{children}</main>
    </div>
  );
}
