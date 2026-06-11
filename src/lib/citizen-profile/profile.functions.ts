import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const idSchema = z.object({ id: z.string().uuid() });

const profileInputSchema = z.object({
  full_name: z.string().min(1).max(120),
  age: z.number().int().min(0).max(130),
  gender: z.string().min(1).max(40),
  state: z.string().min(1).max(80),
  district: z.string().min(1).max(80),
  occupation: z.string().min(1).max(80),
  annual_income: z.string().min(1).max(80),
  education_level: z.string().min(1).max(80),
  disability_status: z.boolean(),
  preferred_language: z.string().min(1).max(40),
  family_members: z.number().int().min(0).max(50),
});

export const fetchCitizenProfileFn = createServerFn({ method: "GET" })
  .inputValidator((data: unknown) => idSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("citizen_profiles")
      .select("*")
      .eq("id", data.id)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return row;
  });

export const createCitizenProfileFn = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => profileInputSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await supabaseAdmin
      .from("citizen_profiles")
      .insert(data)
      .select()
      .single();
    if (error) throw new Error(error.message);
    return row;
  });
