
CREATE TABLE public.government_schemes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  scheme_name TEXT NOT NULL,
  state TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT NOT NULL,
  eligibility_criteria TEXT NOT NULL,
  benefits TEXT NOT NULL,
  required_documents TEXT NOT NULL,
  official_link TEXT,
  last_updated DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_schemes_state ON public.government_schemes(state);
CREATE INDEX idx_schemes_category ON public.government_schemes(category);

GRANT SELECT ON public.government_schemes TO anon;
GRANT SELECT ON public.government_schemes TO authenticated;
GRANT ALL ON public.government_schemes TO service_role;

ALTER TABLE public.government_schemes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view schemes"
  ON public.government_schemes FOR SELECT
  TO anon, authenticated
  USING (true);
