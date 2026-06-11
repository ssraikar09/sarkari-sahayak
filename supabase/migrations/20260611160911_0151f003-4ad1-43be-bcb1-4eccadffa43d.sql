CREATE TABLE public.family_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_profile_id uuid NOT NULL REFERENCES public.citizen_profiles(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  relationship text NOT NULL,
  age integer NOT NULL,
  gender text NOT NULL,
  occupation text NOT NULL,
  annual_income text NOT NULL,
  education_level text NOT NULL,
  disability_status boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_family_members_profile ON public.family_members(citizen_profile_id);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.family_members TO anon, authenticated;
GRANT ALL ON public.family_members TO service_role;

ALTER TABLE public.family_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view family members"
  ON public.family_members FOR SELECT
  TO anon, authenticated USING (true);

CREATE POLICY "Anyone can add family members"
  ON public.family_members FOR INSERT
  TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Anyone can update family members"
  ON public.family_members FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Anyone can delete family members"
  ON public.family_members FOR DELETE
  TO anon, authenticated USING (true);