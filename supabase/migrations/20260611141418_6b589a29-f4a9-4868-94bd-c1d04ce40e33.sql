
CREATE TABLE public.citizen_profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  full_name TEXT NOT NULL,
  age INTEGER NOT NULL,
  gender TEXT NOT NULL,
  state TEXT NOT NULL,
  district TEXT NOT NULL,
  occupation TEXT NOT NULL,
  annual_income TEXT NOT NULL,
  education_level TEXT NOT NULL,
  disability_status BOOLEAN NOT NULL DEFAULT false,
  preferred_language TEXT NOT NULL,
  family_members INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_profiles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.citizen_profiles TO authenticated;
GRANT ALL ON public.citizen_profiles TO service_role;

ALTER TABLE public.citizen_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert citizen profiles"
  ON public.citizen_profiles FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can view citizen profiles"
  ON public.citizen_profiles FOR SELECT
  TO anon, authenticated
  USING (true);
