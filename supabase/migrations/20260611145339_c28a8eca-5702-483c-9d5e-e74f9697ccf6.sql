CREATE TABLE public.assistant_queries (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_profile_id uuid REFERENCES public.citizen_profiles(id) ON DELETE SET NULL,
  query text NOT NULL,
  retrieved_scheme_ids uuid[] NOT NULL DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.assistant_queries TO anon, authenticated;
GRANT ALL ON public.assistant_queries TO service_role;

ALTER TABLE public.assistant_queries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view assistant queries"
  ON public.assistant_queries
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Anyone can record assistant queries"
  ON public.assistant_queries
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE INDEX assistant_queries_profile_idx
  ON public.assistant_queries(citizen_profile_id, created_at DESC);