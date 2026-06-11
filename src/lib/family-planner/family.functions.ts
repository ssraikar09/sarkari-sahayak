import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const memberInputSchema = z.object({
  full_name: z.string().min(1).max(120),
  relationship: z.string().min(1).max(40),
  age: z.number().int().min(0).max(130),
  gender: z.string().min(1).max(40),
  occupation: z.string().min(1).max(80),
  annual_income: z.string().min(1).max(80),
  education_level: z.string().min(1).max(80),
  disability_status: z.boolean(),
});

export const listFamilyMembersFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) =>
    z.object({ citizen_profile_id: z.string().uuid() }).parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("family_members")
      .select("*")
      .eq("citizen_profile_id", data.citizen_profile_id)
      .order("created_at", { ascending: true });
    if (error) throw new Error(error.message);
    return rows ?? [];
  });

export const createFamilyMemberFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ citizen_profile_id: z.string().uuid(), input: memberInputSchema })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("family_members")
      .insert({ ...data.input, citizen_profile_id: data.citizen_profile_id })
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const updateFamilyMemberFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        id: z.string().uuid(),
        citizen_profile_id: z.string().uuid(),
        input: memberInputSchema,
      })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Ownership check: scope update by both id and citizen_profile_id
    const { data: row, error } = await supabaseAdmin
      .from("family_members")
      .update(data.input)
      .eq("id", data.id)
      .eq("citizen_profile_id", data.citizen_profile_id)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });

export const deleteFamilyMemberFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({ id: z.string().uuid(), citizen_profile_id: z.string().uuid() })
      .parse(data),
  )
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("family_members")
      .delete()
      .eq("id", data.id)
      .eq("citizen_profile_id", data.citizen_profile_id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
