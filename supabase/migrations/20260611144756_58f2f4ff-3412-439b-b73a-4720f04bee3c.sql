CREATE TABLE public.eligibility_assessments (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_profile_id uuid NOT NULL REFERENCES public.citizen_profiles(id) ON DELETE CASCADE,
  recommended_scheme_ids uuid[] NOT NULL DEFAULT '{}',
  assessment_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.eligibility_assessments TO anon, authenticated;
GRANT ALL ON public.eligibility_assessments TO service_role;

ALTER TABLE public.eligibility_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view eligibility assessments"
  ON public.eligibility_assessments
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can record eligibility assessments"
  ON public.eligibility_assessments
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX eligibility_assessments_profile_idx
  ON public.eligibility_assessments(citizen_profile_id, created_at DESC);