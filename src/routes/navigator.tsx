import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Compass,
  ExternalLink,
  Info,
  ShieldCheck,
  Sparkles,
  Target,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { buildWelfarePlan } from "@/lib/navigator/navigatorEngine";
import { getStoredProfileId } from "@/lib/citizen-profile/storage";
import {
  loadProgress,
  setStepStatus,
  STATUS_LABEL,
  STATUS_ORDER,
} from "@/lib/navigator/progressTracker";
import type {
  ActionStepStatus,
  StoredProgress,
  SuggestedGoal,
  WelfareActionPlan,
} from "@/lib/navigator/types";

export const Route = createFileRoute("/navigator")({
  head: () => ({
    meta: [
      { title: "AI Welfare Navigator — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Describe your life goal and get a verified, step-by-step welfare action plan grounded in Sarkari Sahayak's knowledge base.",
      },
      { property: "og:title", content: "AI Welfare Navigator — Sarkari Sahayak X" },
      {
        property: "og:description",
        content:
          "Turn life goals into explainable, verified welfare action plans.",
      },
    ],
  }),
  component: NavigatorPage,
});

const SUGGESTED_GOALS: SuggestedGoal[] = [
  { label: "Education Support", prompt: "My daughter is joining engineering college.", category: "Education" },
  { label: "Start a Business", prompt: "I want to start a tailoring business.", category: "Entrepreneurship" },
  { label: "Retirement Planning", prompt: "My father is retiring soon.", category: "Retirement" },
  { label: "Healthcare Protection", prompt: "I need health insurance for my family.", category: "Healthcare" },
  { label: "Agricultural Growth", prompt: "I want to expand my farm.", category: "Agriculture" },
];

function NavigatorPage() {
  const planFn = useServerFn(buildWelfarePlan);
  const [goalText, setGoalText] = useState("");
  const [profileId, setProfileId] = useState<string | null>(null);
  const [progress, setProgress] = useState<StoredProgress>({});

  useEffect(() => {
    setProfileId(getStoredProfileId());
  }, []);

  const mutation = useMutation({
    mutationFn: async (text: string) =>
      (await planFn({ data: { goalText: text, citizenProfileId: profileId } })) as WelfareActionPlan,
    onSuccess: (plan) => {
      setProgress(loadProgress(plan.goalText));
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Failed to build plan";
      toast.error(msg);
    },
  });

  const plan = mutation.data;

  const submit = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setGoalText(trimmed);
    mutation.mutate(trimmed);
  };

  const completion = useMemo(() => {
    if (!plan) return 0;
    const total = plan.steps.length;
    const done = plan.steps.filter((s) => progress[s.id] === "completed").length;
    return total === 0 ? 0 : Math.round((done / total) * 100);
  }, [plan, progress]);

  const updateStatus = (stepId: string, status: ActionStepStatus) => {
    if (!plan) return;
    const next = setStepStatus(plan.goalText, stepId, status);
    setProgress(next);
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30">
      <div className="mx-auto w-full max-w-3xl px-4 py-6 sm:py-10">
        <div className="mb-4 flex items-center justify-between">
          <Button asChild variant="ghost" size="sm">
            <Link to="/">
              <ArrowLeft className="mr-1 size-4" />
              Home
            </Link>
          </Button>
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="size-3" />
            Welfare Navigator
          </Badge>
        </div>

        <header className="mb-5">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            AI Welfare Navigator
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Describe a life goal in your own words. We'll convert it into a
            verified, step-by-step welfare action plan.
          </p>
        </header>

        <Card className="p-4 sm:p-5">
          <label htmlFor="goal" className="text-sm font-medium text-foreground">
            What's your goal?
          </label>
          <Textarea
            id="goal"
            value={goalText}
            onChange={(e) => setGoalText(e.target.value)}
            rows={3}
            placeholder="e.g. My daughter is joining engineering college."
            className="mt-2 resize-none"
          />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {profileId
                ? "Personalized with your citizen profile."
                : "Tip: complete your citizen profile for personalized guidance."}
            </p>
            <Button
              onClick={() => submit(goalText)}
              disabled={!goalText.trim() || mutation.isPending}
            >
              <Compass className="mr-1 size-4" />
              {mutation.isPending ? "Planning…" : "Build my plan"}
            </Button>
          </div>
        </Card>

        <section className="mt-5">
          <h2 className="mb-2 text-sm font-semibold text-foreground">Suggested goals</h2>
          <div className="flex flex-wrap gap-2">
            {SUGGESTED_GOALS.map((g) => (
              <button
                key={g.label}
                type="button"
                onClick={() => submit(g.prompt)}
                className="rounded-full border bg-background px-3 py-1.5 text-xs text-foreground transition hover:border-primary/40 hover:bg-accent"
              >
                {g.label}
              </button>
            ))}
          </div>
        </section>

        {mutation.isPending ? <PlanSkeleton /> : null}
        {plan ? (
          <PlanView
            plan={plan}
            progress={progress}
            completion={completion}
            onStatusChange={updateStatus}
          />
        ) : null}
      </div>
    </main>
  );
}

function PlanSkeleton() {
  return (
    <div className="mt-6 space-y-3">
      <div className="h-20 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
      <div className="h-24 animate-pulse rounded-2xl bg-muted" />
    </div>
  );
}

function PlanView({
  plan,
  progress,
  completion,
  onStatusChange,
}: {
  plan: WelfareActionPlan;
  progress: StoredProgress;
  completion: number;
  onStatusChange: (stepId: string, status: ActionStepStatus) => void;
}) {
  return (
    <div className="mt-6 space-y-5">
      <Card className="p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Target className="size-4 text-primary" />
            <span className="text-sm font-semibold text-foreground">
              Goal category: {plan.classification.category}
            </span>
          </div>
          <Badge variant="secondary" className="text-[10px]">
            Confidence {Math.round(plan.classification.confidence * 100)}%
          </Badge>
        </div>
        <p className="mt-2 text-sm text-muted-foreground italic">
          "{plan.goalText}"
        </p>
        <div className="mt-4">
          <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{completion}%</span>
          </div>
          <Progress value={completion} />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <Info className="size-4 text-primary" />
          Why this plan?
        </div>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {plan.rationale.map((r, i) => (
            <li key={i} className="flex items-start gap-2">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
              {r}
            </li>
          ))}
        </ul>
      </Card>

      <div className="space-y-3">
        {plan.steps.map((step, idx) => {
          const status = progress[step.id] ?? "not_started";
          return (
            <Card key={step.id} className="p-4 sm:p-5">
              <div className="flex items-start gap-3">
                <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {idx + 1}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-sm font-semibold text-foreground sm:text-base">
                    {step.title}
                  </h3>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {step.description}
                  </p>
                  <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
                    <Info className="mt-0.5 size-3 shrink-0" />
                    <span>
                      <span className="font-medium text-foreground">Why suggested:</span>{" "}
                      {step.rationale}
                    </span>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Select
                      value={status}
                      onValueChange={(v) =>
                        onStatusChange(step.id, v as ActionStepStatus)
                      }
                    >
                      <SelectTrigger className="h-8 w-[150px] text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {STATUS_ORDER.map((s) => (
                          <SelectItem key={s} value={s} className="text-xs">
                            {STATUS_LABEL[s]}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {step.schemeId ? (
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <Link to="/schemes/$id" params={{ id: step.schemeId }}>
                          View scheme
                        </Link>
                      </Button>
                    ) : null}
                    {step.link ? (
                      <Button asChild size="sm" variant="outline" className="h-8">
                        <a href={step.link} target="_blank" rel="noopener noreferrer">
                          Official link
                          <ExternalLink className="ml-1 size-3" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {plan.sources.length > 0 ? (
        <Card className="p-4 sm:p-5">
          <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ShieldCheck className="size-4 text-primary" />
            Verified Sources
          </div>
          <ul className="mt-2 space-y-1.5 text-sm">
            {plan.sources.map((s) => (
              <li key={s.id} className="flex items-start gap-2">
                <Badge variant="secondary" className="mt-0.5 text-[10px]">
                  {s.scheme_scope === "National" ? "National" : s.state}
                </Badge>
                <Link
                  to="/schemes/$id"
                  params={{ id: s.id }}
                  className="font-medium text-foreground hover:text-primary"
                >
                  {s.scheme_name}
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      ) : (
        <Card className="p-4 sm:p-5">
          <p className="text-sm text-muted-foreground">
            We could not locate verified schemes for this goal in Sarkari
            Sahayak's knowledge base. Browse schemes or ask the AI Assistant
            for follow-ups.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild size="sm" variant="outline">
              <Link to="/schemes">Browse Schemes</Link>
            </Button>
            <Button asChild size="sm" variant="outline">
              <Link to="/assistant">Ask the Assistant</Link>
            </Button>
          </div>
        </Card>
      )}
    </div>
  );
}
