import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { DecisionTimelineEvent } from "./types";

export const getDecisionTimelineFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ citizen_profile_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const id = data.citizen_profile_id;

    const [profile, assessments, family, navigator, guides] = await Promise.all([
      supabaseAdmin
        .from("citizen_profiles")
        .select("created_at")
        .eq("id", id)
        .maybeSingle(),
      supabaseAdmin
        .from("eligibility_assessments")
        .select("created_at")
        .eq("citizen_profile_id", id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("family_members")
        .select("created_at")
        .eq("citizen_profile_id", id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("navigator_usage_logs")
        .select("created_at")
        .eq("citizen_profile_id", id)
        .order("created_at", { ascending: true }),
      supabaseAdmin
        .from("application_guide_usage")
        .select("created_at")
        .eq("citizen_profile_id", id)
        .order("created_at", { ascending: true }),
    ]);

    const events: DecisionTimelineEvent[] = [
      {
        key: "profile_created",
        label: "Profile Created",
        occurredAt: profile.data?.created_at ?? null,
        count: profile.data ? 1 : 0,
        completed: !!profile.data,
      },
      {
        key: "eligibility_assessment",
        label: "Eligibility Assessment",
        occurredAt: assessments.data?.[0]?.created_at ?? null,
        count: assessments.data?.length ?? 0,
        completed: (assessments.data?.length ?? 0) > 0,
      },
      {
        key: "family_analysis",
        label: "Family Analysis",
        occurredAt: family.data?.[0]?.created_at ?? null,
        count: family.data?.length ?? 0,
        completed: (family.data?.length ?? 0) > 0,
      },
      {
        key: "navigator_plan",
        label: "Navigator Plan Generated",
        occurredAt: navigator.data?.[0]?.created_at ?? null,
        count: navigator.data?.length ?? 0,
        completed: (navigator.data?.length ?? 0) > 0,
      },
      {
        key: "application_guidance",
        label: "Application Guidance Accessed",
        occurredAt: guides.data?.[0]?.created_at ?? null,
        count: guides.data?.length ?? 0,
        completed: (guides.data?.length ?? 0) > 0,
      },
    ];

    return events;
  });
