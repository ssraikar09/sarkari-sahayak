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
  ChevronsLeft,
  ChevronsRight,
  Search,
  Bell,
  Globe,
  UserCircle2,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

type NavItem = { to: string; label: string; icon: LucideIcon };
type NavGroup = { label: string; items: NavItem[] };

const groups: NavGroup[] = [
  {
    label: "Primary",
    items: [
      { to: "/", label: "Home", icon: Home },
      { to: "/schemes", label: "Schemes", icon: FileText },
      { to: "/assistant", label: "Assistant", icon: MessageCircle },
      { to: "/eligibility", label: "Eligibility", icon: CheckCircle2 },
      { to: "/family-planner", label: "Family Planner", icon: Users },
      { to: "/navigator", label: "Navigator", icon: Compass },
    ],
  },
  {
    label: "Intelligence",
    items: [
      { to: "/dashboard", label: "Impact Dashboard", icon: BarChart3 },
      { to: "/insights", label: "Research Insights", icon: TrendingUp },
      { to: "/decision-engine", label: "Decision Engine", icon: Scale },
      { to: "/knowledge-graph", label: "Knowledge Graph", icon: Network },
      { to: "/welfare-roadmap", label: "Welfare Roadmap", icon: MapIcon },
    ],
  },
  {
    label: "Operations",
    items: [{ to: "/agent-dashboard", label: "CSC Dashboard", icon: Briefcase }],
  },
];

const titleMap: Record<string, string> = {
  "/": "Home",
  "/schemes": "Schemes",
  "/assistant": "AI Assistant",
  "/eligibility": "Eligibility",
  "/onboarding": "Create Profile",
  "/family-planner": "Family Planner",
  "/navigator": "Welfare Navigator",
  "/dashboard": "Impact Dashboard",
  "/insights": "Research Insights",
  "/decision-engine": "Decision Engine",
  "/knowledge-graph": "Knowledge Graph",
  "/welfare-roadmap": "Welfare Roadmap",
  "/agent-dashboard": "CSC Dashboard",
  "/application-guide": "Application Guide",
};

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  const title = useMemo(() => {
    const exact = titleMap[pathname];
    if (exact) return exact;
    const match = Object.keys(titleMap)
      .filter((k) => k !== "/" && pathname.startsWith(k))
      .sort((a, b) => b.length - a.length)[0];
    return match ? titleMap[match] : "Sarkari Sahayak X";
  }, [pathname]);

  const isActive = (to: string) =>
    to === "/" ? pathname === "/" : pathname.startsWith(to);

  const allItems = groups.flatMap((g) => g.items);

  return (
    <div className="flex min-h-dvh w-full bg-muted/30">
      {/* Desktop Sidebar */}
      <aside
        className={cn(
          "sticky top-0 hidden h-dvh shrink-0 flex-col border-r border-border/60 bg-card transition-[width] duration-200 md:flex",
          collapsed ? "w-[68px]" : "w-60",
        )}
      >
        <SidebarBrand collapsed={collapsed} />
        <SidebarNav
          groups={groups}
          collapsed={collapsed}
          isActive={isActive}
        />
        <div className="mt-auto border-t border-border/60 p-2">
          <button
            type="button"
            onClick={() => setCollapsed((v) => !v)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-md px-2 py-2 text-xs font-medium text-muted-foreground hover:bg-accent hover:text-foreground"
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <ChevronsRight className="size-4" />
            ) : (
              <>
                <ChevronsLeft className="size-4" />
                Collapse
              </>
            )}
          </button>
        </div>
      </aside>

      {/* Mobile drawer */}
      {mobileOpen ? (
        <div className="fixed inset-0 z-50 md:hidden">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="absolute inset-y-0 left-0 flex w-64 flex-col bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-3 py-3">
              <SidebarBrand collapsed={false} />
              <button
                onClick={() => setMobileOpen(false)}
                aria-label="Close menu"
                className="grid size-8 place-items-center rounded-md hover:bg-accent"
              >
                <X className="size-4" />
              </button>
            </div>
            <SidebarNav groups={groups} collapsed={false} isActive={isActive} />
          </aside>
        </div>
      ) : null}

      {/* Main area */}
      <div className="flex min-w-0 flex-1 flex-col">
        <TopHeader
          title={title}
          onOpenMobile={() => setMobileOpen(true)}
        />
        <main className="flex-1">{children}</main>
        <MobileBottomNav items={allItems} isActive={isActive} />
      </div>
    </div>
  );
}

function SidebarBrand({ collapsed }: { collapsed: boolean }) {
  return (
    <Link
      to="/"
      className="flex items-center gap-2.5 border-b border-border/60 px-4 py-3.5"
    >
      <div className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Sparkles className="size-4" />
      </div>
      {!collapsed && (
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold tracking-tight">
            Sarkari Sahayak X
          </div>
          <div className="truncate text-[10px] uppercase tracking-wider text-muted-foreground">
            Welfare AI Platform
          </div>
        </div>
      )}
    </Link>
  );
}

function SidebarNav({
  groups,
  collapsed,
  isActive,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  isActive: (to: string) => boolean;
}) {
  return (
    <nav className="flex-1 overflow-y-auto px-2 py-3">
      {groups.map((group) => (
        <div key={group.label} className="mb-4">
          {!collapsed && (
            <div className="px-2 pb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
              {group.label}
            </div>
          )}
          <ul className="space-y-0.5">
            {group.items.map((item) => {
              const Icon = item.icon;
              const active = isActive(item.to);
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    title={collapsed ? item.label : undefined}
                    className={cn(
                      "group relative flex items-center gap-2.5 rounded-md px-2.5 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary/10 text-primary"
                        : "text-muted-foreground hover:bg-accent hover:text-foreground",
                      collapsed && "justify-center",
                    )}
                  >
                    {active && (
                      <span className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-r bg-primary" />
                    )}
                    <Icon className="size-4 shrink-0" />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function TopHeader({
  title,
  onOpenMobile,
}: {
  title: string;
  onOpenMobile: () => void;
}) {
  return (
    <header className="sticky top-0 z-30 border-b border-border/60 bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
      <div className="flex h-14 items-center gap-3 px-4 sm:px-6">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Open menu"
          className="inline-flex size-9 items-center justify-center rounded-md border border-input md:hidden"
        >
          <Menu className="size-4" />
        </button>

        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold tracking-tight sm:text-lg">
            {title}
          </h1>
        </div>

        <div className="hidden items-center gap-2 lg:flex">
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search schemes, citizens..."
              className="h-9 w-64 rounded-md border border-input bg-background pl-8 pr-3 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            />
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            type="button"
            aria-label="Language"
            className="inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Globe className="size-4" />
          </button>
          <button
            type="button"
            aria-label="Notifications"
            className="relative inline-flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <Bell className="size-4" />
            <span className="absolute right-2 top-2 size-1.5 rounded-full bg-primary" />
          </button>
          <Link
            to="/onboarding"
            aria-label="Profile"
            className="inline-flex size-9 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground"
          >
            <UserCircle2 className="size-5" />
          </Link>
        </div>
      </div>
    </header>
  );
}

function MobileBottomNav({
  items,
  isActive,
}: {
  items: NavItem[];
  isActive: (to: string) => boolean;
}) {
  const tabs = [
    items.find((i) => i.to === "/"),
    items.find((i) => i.to === "/schemes"),
    items.find((i) => i.to === "/assistant"),
    items.find((i) => i.to === "/family-planner"),
    items.find((i) => i.to === "/dashboard"),
  ].filter(Boolean) as NavItem[];

  return (
    <nav className="sticky bottom-0 z-30 grid grid-cols-5 border-t border-border/60 bg-background/95 backdrop-blur md:hidden">
      {tabs.map((item) => {
        const Icon = item.icon;
        const active = isActive(item.to);
        return (
          <Link
            key={item.to}
            to={item.to}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
              active ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
