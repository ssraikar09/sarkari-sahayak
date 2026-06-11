import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const logEligibilityAssessmentFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        citizen_profile_id: z.string().uuid(),
        recommended_scheme_ids: z.array(z.string().uuid()).max(500),
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      await supabaseAdmin.from("eligibility_assessments").insert({
        citizen_profile_id: data.citizen_profile_id,
        recommended_scheme_ids: data.recommended_scheme_ids,
      });
    } catch (err) {
      console.warn("Failed to log eligibility assessment", err);
    }
    return { ok: true };
  });
