import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const logSchema = z.object({
  schemeId: z.string().uuid(),
  citizenProfileId: z.string().uuid().nullable().optional(),
});

export const logGuidanceAccessFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => logSchema.parse(data))
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("application_guide_usage" as never).insert({
        scheme_id: data.schemeId,
        citizen_profile_id: data.citizenProfileId ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (e) {
      console.warn("Failed to log application guide access", e);
    }
    return { ok: true };
  });

const fallbackSchema = z.object({
  schemeId: z.string().uuid(),
  fallbackType: z.enum(["direct_link", "department_link", "unavailable"]),
});

export const logFallbackUsageFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => fallbackSchema.parse(data))
  .handler(async ({ data }) => {
    // Only log when an actual fallback is used (not a direct link).
    if (data.fallbackType === "direct_link") return { ok: true, logged: false };
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("official_link_fallback_logs" as never).insert({
        scheme_id: data.schemeId,
        fallback_type: data.fallbackType,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any);
    } catch (e) {
      console.warn("Failed to log official link fallback", e);
    }
    return { ok: true, logged: true };
  });
