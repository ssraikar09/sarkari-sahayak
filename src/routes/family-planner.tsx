import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import {
  ArrowLeft,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { RecommendationCard } from "@/components/eligibility/RecommendationCard";
import {
  fetchCitizenProfile,
  getStoredProfileId,
} from "@/lib/citizen-profile/storage";
import {
  EDUCATION_LEVELS,
  GENDERS,
  INCOME_BRACKETS,
  OCCUPATIONS,
  type CitizenProfile,
} from "@/lib/citizen-profile/constants";
import {
  assessFamilyEligibility,
  createFamilyMember,
  deleteFamilyMember,
  listFamilyMembers,
  RELATIONSHIPS,
  updateFamilyMember,
  type FamilyAssessment,
  type FamilyMember,
  type FamilyMemberInput,
} from "@/lib/family-planner";

export const Route = createFileRoute("/family-planner")({
  head: () => ({
    meta: [
      { title: "Family Welfare Planner — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Plan welfare for your whole household. Add family members and see explainable government scheme recommendations for each one.",
      },
      {
        property: "og:title",
        content: "Family Welfare Planner — Sarkari Sahayak X",
      },
      {
        property: "og:description",
        content:
          "Household-level government scheme recommendations powered by Sarkari Sahayak's explainable eligibility engine.",
      },
    ],
  }),
  component: FamilyPlannerPage,
});

const EMPTY_FORM: FamilyMemberInput = {
  full_name: "",
  relationship: "Father",
  age: 30,
  gender: "Male",
  occupation: "Worker",
  annual_income: "Less than ₹1 lakh",
  education_level: "Secondary",
  disability_status: false,
};

function FamilyPlannerPage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<CitizenProfile | null>(null);
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [assessment, setAssessment] = useState<FamilyAssessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [assessing, setAssessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<FamilyMember | null>(null);
  const [form, setForm] = useState<FamilyMemberInput>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    const id = getStoredProfileId();
    if (!id) {
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
        const list = await listFamilyMembers(p.id);
        if (!active) return;
        setMembers(list);
      } catch (e) {
        console.error(e);
        if (active) setError("Couldn't load your family planner.");
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [navigate]);

  // Re-run the household assessment whenever the member list changes.
  useEffect(() => {
    if (!profile) return;
    let active = true;
    setAssessing(true);
    assessFamilyEligibility(profile)
      .then((res) => {
        if (active) setAssessment(res);
      })
      .catch((e) => {
        console.error(e);
        if (active) setError("Couldn't compute family recommendations.");
      })
      .finally(() => {
        if (active) setAssessing(false);
      });
    return () => {
      active = false;
    };
  }, [profile, members]);

  const openAdd = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  };

  const openEdit = (m: FamilyMember) => {
    setEditing(m);
    setForm({
      full_name: m.full_name,
      relationship: m.relationship,
      age: m.age,
      gender: m.gender,
      occupation: m.occupation,
      annual_income: m.annual_income,
      education_level: m.education_level,
      disability_status: m.disability_status,
    });
    setShowForm(true);
  };

  const closeForm = () => {
    setShowForm(false);
    setEditing(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;
    if (!form.full_name.trim()) return;
    setSaving(true);
    try {
      if (editing) {
        const updated = await updateFamilyMember(editing.id, form, profile.id);
        setMembers((prev) =>
          prev.map((m) => (m.id === updated.id ? updated : m)),
        );
      } else {
        const created = await createFamilyMember(profile.id, form);
        setMembers((prev) => [...prev, created]);
      }
      closeForm();
    } catch (e2) {
      console.error(e2);
      setError("Couldn't save the family member.");
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: FamilyMember) => {
    if (!profile) return;
    if (!confirm(`Remove ${m.full_name} from your family?`)) return;
    try {
      await deleteFamilyMember(m.id, profile.id);
      setMembers((prev) => prev.filter((x) => x.id !== m.id));
    } catch (e) {
      console.error(e);
      setError("Couldn't remove that family member.");
    }
  };

  const categoryEntries = useMemo(
    () =>
      assessment
        ? Object.entries(assessment.categoryBreakdown).sort(
            (a, b) => b[1] - a[1],
          )
        : [],
    [assessment],
  );

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
              <Link to="/eligibility">My Eligibility</Link>
            </Button>
          ) : null}
        </div>

        <header className="mb-8 text-center sm:text-left">
          <div className="inline-flex items-center gap-2 rounded-full border bg-card/60 px-3 py-1 text-xs font-medium text-muted-foreground">
            <Sparkles className="size-3.5" />
            Family Welfare Planner
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            Plan welfare for your whole household
          </h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Add each family member to see government schemes they may qualify
            for — with transparent reasoning for every recommendation.
          </p>
        </header>

        {loading ? (
          <div className="grid gap-4 sm:grid-cols-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <Skeleton key={i} className="h-40 w-full rounded-2xl" />
            ))}
          </div>
        ) : (
          <>
            <section className="mb-8 rounded-2xl border bg-card p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-foreground">
                  <Users className="size-5 text-primary" />
                  <h2 className="text-lg font-semibold">Family members</h2>
                  <Badge variant="secondary">{members.length}</Badge>
                </div>
                <Button size="sm" onClick={openAdd}>
                  <Plus className="mr-1 size-4" />
                  Add member
                </Button>
              </div>

              {members.length === 0 ? (
                <p className="mt-4 text-sm text-muted-foreground">
                  No family members yet. Add a parent, spouse, child or senior
                  to begin household planning.
                </p>
              ) : (
                <ul className="mt-4 grid gap-3 sm:grid-cols-2">
                  {members.map((m) => (
                    <li
                      key={m.id}
                      className="flex items-start justify-between gap-3 rounded-xl border bg-background/60 p-4"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium text-foreground">
                          {m.full_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.relationship} · {m.age} · {m.gender} ·{" "}
                          {m.occupation}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {m.education_level} · {m.annual_income}
                          {m.disability_status ? " · Disability" : ""}
                        </p>
                      </div>
                      <div className="flex shrink-0 gap-1">
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => openEdit(m)}
                          aria-label={`Edit ${m.full_name}`}
                        >
                          <Pencil className="size-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => remove(m)}
                          aria-label={`Remove ${m.full_name}`}
                        >
                          <Trash2 className="size-4 text-destructive" />
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {error ? (
              <div className="mb-6 rounded-xl border border-destructive/40 bg-destructive/5 p-4 text-sm text-destructive">
                {error}
              </div>
            ) : null}

            {members.length > 0 ? (
              <section>
                <div className="mb-4 flex flex-wrap items-baseline gap-2">
                  <h2 className="text-xl font-semibold text-foreground">
                    Household recommendations
                  </h2>
                  {assessing ? (
                    <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                      <Loader2 className="size-3 animate-spin" /> updating…
                    </span>
                  ) : assessment ? (
                    <span className="text-sm text-muted-foreground">
                      Your family may be eligible for{" "}
                      <span className="font-medium text-foreground">
                        {assessment.totalRecommendations}
                      </span>{" "}
                      scheme
                      {assessment.totalRecommendations === 1 ? "" : "s"}.
                    </span>
                  ) : null}
                </div>

                {categoryEntries.length > 0 ? (
                  <div className="mb-6 flex flex-wrap gap-2">
                    {categoryEntries.map(([cat, count]) => (
                      <Badge
                        key={cat}
                        variant="secondary"
                        className="rounded-full"
                      >
                        {cat} · {count}
                      </Badge>
                    ))}
                  </div>
                ) : null}

                {assessment && assessment.totalRecommendations === 0 ? (
                  <EmptyAssessment />
                ) : assessment ? (
                  <div className="space-y-8">
                    {assessment.members.map((mr) =>
                      mr.recommendations.length === 0 ? null : (
                        <div key={mr.member.id}>
                          <div className="mb-3 flex flex-wrap items-baseline gap-2">
                            <h3 className="text-lg font-semibold text-foreground">
                              {mr.member.full_name}
                            </h3>
                            <span className="text-sm text-muted-foreground">
                              {mr.member.relationship} · {mr.member.age} ·{" "}
                              {mr.member.occupation}
                            </span>
                            <Badge variant="secondary" className="ml-auto">
                              {mr.recommendations.length} scheme
                              {mr.recommendations.length === 1 ? "" : "s"}
                            </Badge>
                          </div>
                          <div className="grid gap-4 sm:grid-cols-2">
                            {mr.recommendations.map((r) => (
                              <RecommendationCard
                                key={`${mr.member.id}-${r.scheme.id}`}
                                recommendation={r}
                                applyLabel="Apply Now"
                              />
                            ))}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                ) : null}
              </section>
            ) : null}
          </>
        )}
      </div>

      {showForm ? (
        <MemberFormDialog
          editing={editing}
          form={form}
          setForm={setForm}
          onClose={closeForm}
          onSubmit={submit}
          saving={saving}
        />
      ) : null}
    </main>
  );
}

function EmptyAssessment() {
  return (
    <div className="rounded-2xl border bg-card p-8 text-center shadow-sm">
      <h3 className="text-lg font-semibold text-foreground">
        No additional family welfare recommendations identified.
      </h3>
      <p className="mx-auto mt-2 max-w-lg text-sm text-muted-foreground">
        We couldn't match verified schemes for these family members yet. You
        can still explore the catalogue manually.
      </p>
      <div className="mt-5">
        <Button asChild>
          <Link to="/schemes">Browse Schemes</Link>
        </Button>
      </div>
    </div>
  );
}

function MemberFormDialog({
  editing,
  form,
  setForm,
  onClose,
  onSubmit,
  saving,
}: {
  editing: FamilyMember | null;
  form: FamilyMemberInput;
  setForm: React.Dispatch<React.SetStateAction<FamilyMemberInput>>;
  onClose: () => void;
  onSubmit: (e: React.FormEvent) => void;
  saving: boolean;
}) {
  const update = <K extends keyof FamilyMemberInput>(
    key: K,
    value: FamilyMemberInput[K],
  ) => setForm((prev) => ({ ...prev, [key]: value }));

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal="true"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-t-2xl bg-card shadow-xl sm:rounded-2xl">
        <div className="flex items-center justify-between border-b p-4">
          <h2 className="text-base font-semibold">
            {editing ? "Edit family member" : "Add family member"}
          </h2>
          <Button
            size="icon"
            variant="ghost"
            onClick={onClose}
            aria-label="Close"
          >
            <X className="size-4" />
          </Button>
        </div>
        <form
          onSubmit={onSubmit}
          className="max-h-[75vh] space-y-4 overflow-y-auto p-4"
        >
          <Field label="Full name">
            <Input
              required
              maxLength={100}
              value={form.full_name}
              onChange={(e) => update("full_name", e.target.value)}
            />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Relationship">
              <Select
                value={form.relationship}
                onValueChange={(v) => update("relationship", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RELATIONSHIPS.map((r) => (
                    <SelectItem key={r} value={r}>
                      {r}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Age">
              <Input
                type="number"
                required
                min={0}
                max={120}
                value={form.age}
                onChange={(e) => update("age", Number(e.target.value) || 0)}
              />
            </Field>
            <Field label="Gender">
              <Select
                value={form.gender}
                onValueChange={(v) => update("gender", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {GENDERS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Occupation">
              <Select
                value={form.occupation}
                onValueChange={(v) => update("occupation", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {OCCUPATIONS.map((o) => (
                    <SelectItem key={o} value={o}>
                      {o}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Annual income">
              <Select
                value={form.annual_income}
                onValueChange={(v) => update("annual_income", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {INCOME_BRACKETS.map((b) => (
                    <SelectItem key={b} value={b}>
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
            <Field label="Education level">
              <Select
                value={form.education_level}
                onValueChange={(v) => update("education_level", v)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {EDUCATION_LEVELS.map((l) => (
                    <SelectItem key={l} value={l}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>
          <div className="flex items-center justify-between rounded-xl border bg-background/60 p-3">
            <Label htmlFor="disability" className="text-sm">
              Person with disability
            </Label>
            <Switch
              id="disability"
              checked={form.disability_status}
              onCheckedChange={(v) => update("disability_status", v)}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="mr-1 size-4 animate-spin" />
                  Saving…
                </>
              ) : editing ? (
                "Save changes"
              ) : (
                "Add member"
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      {children}
    </div>
  );
}
