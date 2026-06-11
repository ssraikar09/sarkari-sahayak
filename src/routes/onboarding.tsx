import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import {
  EDUCATION_LEVELS,
  GENDERS,
  INCOME_BRACKETS,
  LANGUAGES,
  OCCUPATIONS,
  STATES,
  type CitizenProfileInput,
} from "@/lib/citizen-profile/constants";
import { citizenProfileSchema } from "@/lib/citizen-profile/schema";
import { createCitizenProfile } from "@/lib/citizen-profile/storage";

export const Route = createFileRoute("/onboarding")({
  head: () => ({
    meta: [
      { title: "Create your profile — Sarkari Sahayak X" },
      {
        name: "description",
        content:
          "Tell us about yourself to unlock personalized government scheme recommendations.",
      },
    ],
  }),
  component: Onboarding,
});

type FormState = Partial<CitizenProfileInput>;

const steps = [
  { id: "identity", title: "About you", fields: ["full_name", "age", "gender"] },
  { id: "location", title: "Where you live", fields: ["state", "district"] },
  {
    id: "livelihood",
    title: "Livelihood",
    fields: ["occupation", "annual_income", "education_level"],
  },
  {
    id: "household",
    title: "Household & preferences",
    fields: ["family_members", "disability_status", "preferred_language"],
  },
] as const;

function Onboarding() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [values, setValues] = useState<FormState>({
    disability_status: false,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  const progress = useMemo(
    () => Math.round(((step + 1) / steps.length) * 100),
    [step],
  );

  const set = <K extends keyof CitizenProfileInput>(
    key: K,
    value: CitizenProfileInput[K],
  ) => {
    setValues((v) => ({ ...v, [key]: value }));
    setErrors((e) => {
      if (!e[key as string]) return e;
      const { [key as string]: _, ...rest } = e;
      return rest;
    });
  };

  const validateStep = () => {
    const fields = steps[step].fields as readonly (keyof CitizenProfileInput)[];
    const partial = citizenProfileSchema.partial();
    const result = partial.safeParse(values);
    const next: Record<string, string> = {};
    if (!result.success) {
      for (const issue of result.error.issues) {
        const key = String(issue.path[0]);
        if (fields.includes(key as keyof CitizenProfileInput) && !next[key]) {
          next[key] = issue.message;
        }
      }
    }
    for (const f of fields) {
      const v = values[f];
      if (v === undefined || v === null || v === "") {
        next[f as string] = "This field is required";
      }
    }
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const onNext = () => {
    if (!validateStep()) return;
    if (step < steps.length - 1) setStep(step + 1);
    else void onSubmit();
  };

  const onBack = () => {
    if (step === 0) navigate({ to: "/" });
    else setStep(step - 1);
  };

  const onSubmit = async () => {
    const parsed = citizenProfileSchema.safeParse(values);
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const issue of parsed.error.issues) {
        const key = String(issue.path[0]);
        if (!next[key]) next[key] = issue.message;
      }
      setErrors(next);
      toast.error("Please complete all required fields.");
      return;
    }
    setSubmitting(true);
    try {
      const profile = await createCitizenProfile(parsed.data);
      toast.success("Profile created");
      navigate({ to: "/profile/$id", params: { id: profile.id } });
    } catch (err) {
      console.error(err);
      toast.error("Could not save profile. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-accent/30 px-4 py-8 sm:py-14">
      <div className="mx-auto w-full max-w-2xl">
        <div className="mb-6">
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Step {step + 1} of {steps.length}
            </span>
            <span className="font-medium text-foreground">{progress}% complete</span>
          </div>
          <Progress value={progress} className="mt-2 h-2" />
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm sm:p-8">
          <h1 className="text-2xl font-bold tracking-tight text-foreground sm:text-3xl">
            {steps[step].title}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your answers help us recommend the right government schemes for you.
          </p>

          <div className="mt-8 space-y-5">
            {step === 0 && (
              <>
                <Field label="Full name" error={errors.full_name} htmlFor="full_name">
                  <Input
                    id="full_name"
                    inputMode="text"
                    autoComplete="name"
                    placeholder="e.g. Anita Sharma"
                    className="h-12 text-base"
                    value={values.full_name ?? ""}
                    onChange={(e) => set("full_name", e.target.value)}
                  />
                </Field>
                <div className="grid gap-5 sm:grid-cols-2">
                  <Field label="Age" error={errors.age} htmlFor="age">
                    <Input
                      id="age"
                      type="number"
                      inputMode="numeric"
                      min={1}
                      max={120}
                      placeholder="e.g. 35"
                      className="h-12 text-base"
                      value={values.age ?? ""}
                      onChange={(e) =>
                        set("age", e.target.value === "" ? (undefined as never) : Number(e.target.value))
                      }
                    />
                  </Field>
                  <Field label="Gender" error={errors.gender}>
                    <SelectInput
                      placeholder="Select gender"
                      value={values.gender}
                      options={GENDERS}
                      onChange={(v) => set("gender", v)}
                    />
                  </Field>
                </div>
              </>
            )}

            {step === 1 && (
              <>
                <Field label="State" error={errors.state}>
                  <SelectInput
                    placeholder="Select your state"
                    value={values.state}
                    options={STATES}
                    onChange={(v) => set("state", v)}
                  />
                </Field>
                <Field label="District" error={errors.district} htmlFor="district">
                  <Input
                    id="district"
                    placeholder="e.g. Mysuru"
                    className="h-12 text-base"
                    value={values.district ?? ""}
                    onChange={(e) => set("district", e.target.value)}
                  />
                </Field>
              </>
            )}

            {step === 2 && (
              <>
                <Field label="Occupation" error={errors.occupation}>
                  <SelectInput
                    placeholder="Select your occupation"
                    value={values.occupation}
                    options={OCCUPATIONS}
                    onChange={(v) => set("occupation", v)}
                  />
                </Field>
                <Field label="Annual family income" error={errors.annual_income}>
                  <SelectInput
                    placeholder="Select income range"
                    value={values.annual_income}
                    options={INCOME_BRACKETS}
                    onChange={(v) => set("annual_income", v)}
                  />
                </Field>
                <Field label="Education level" error={errors.education_level}>
                  <SelectInput
                    placeholder="Select education"
                    value={values.education_level}
                    options={EDUCATION_LEVELS}
                    onChange={(v) => set("education_level", v)}
                  />
                </Field>
              </>
            )}

            {step === 3 && (
              <>
                <Field
                  label="Number of family members"
                  error={errors.family_members}
                  htmlFor="family_members"
                >
                  <Input
                    id="family_members"
                    type="number"
                    inputMode="numeric"
                    min={1}
                    max={30}
                    placeholder="e.g. 4"
                    className="h-12 text-base"
                    value={values.family_members ?? ""}
                    onChange={(e) =>
                      set(
                        "family_members",
                        e.target.value === "" ? (undefined as never) : Number(e.target.value),
                      )
                    }
                  />
                </Field>

                <Field label="Disability status" error={errors.disability_status}>
                  <RadioGroup
                    value={values.disability_status ? "yes" : "no"}
                    onValueChange={(v) => set("disability_status", v === "yes")}
                    className="flex gap-3"
                  >
                    <label
                      htmlFor="dis-no"
                      className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border bg-background p-4 text-base hover:bg-accent"
                    >
                      <RadioGroupItem id="dis-no" value="no" />
                      No
                    </label>
                    <label
                      htmlFor="dis-yes"
                      className="flex flex-1 cursor-pointer items-center gap-3 rounded-lg border bg-background p-4 text-base hover:bg-accent"
                    >
                      <RadioGroupItem id="dis-yes" value="yes" />
                      Yes
                    </label>
                  </RadioGroup>
                </Field>

                <Field label="Preferred language" error={errors.preferred_language}>
                  <SelectInput
                    placeholder="Select language"
                    value={values.preferred_language}
                    options={LANGUAGES}
                    onChange={(v) => set("preferred_language", v)}
                  />
                </Field>
              </>
            )}
          </div>

          <div className="mt-10 flex items-center justify-between gap-3">
            <Button
              type="button"
              variant="ghost"
              size="lg"
              onClick={onBack}
              disabled={submitting}
              className="h-12"
            >
              <ArrowLeft className="mr-2 size-4" />
              Back
            </Button>
            <Button
              type="button"
              size="lg"
              onClick={onNext}
              disabled={submitting}
              className="h-12 min-w-36"
            >
              {submitting ? (
                <Loader2 className="size-4 animate-spin" />
              ) : step === steps.length - 1 ? (
                "Finish"
              ) : (
                <>
                  Continue
                  <ArrowRight className="ml-2 size-4" />
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </main>
  );
}

function Field({
  label,
  error,
  htmlFor,
  children,
}: {
  label: string;
  error?: string;
  htmlFor?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={htmlFor} className="text-sm font-medium text-foreground">
        {label}
      </Label>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

function SelectInput({
  value,
  options,
  onChange,
  placeholder,
}: {
  value: string | undefined;
  options: readonly string[];
  onChange: (v: string) => void;
  placeholder: string;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-12 text-base">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        {options.map((o) => (
          <SelectItem key={o} value={o} className="text-base">
            {o}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
