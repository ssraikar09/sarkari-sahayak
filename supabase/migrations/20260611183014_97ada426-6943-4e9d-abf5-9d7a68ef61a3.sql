CREATE TABLE public.navigator_usage_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  citizen_profile_id uuid REFERENCES public.citizen_profiles(id) ON DELETE SET NULL,
  goal_text text NOT NULL,
  goal_category text NOT NULL,
  recommended_scheme_ids uuid[] NOT NULL DEFAULT '{}'::uuid[],
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.navigator_usage_logs TO anon, authenticated;
GRANT ALL ON public.navigator_usage_logs TO service_role;

ALTER TABLE public.navigator_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log navigator usage"
  ON public.navigator_usage_logs FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);

CREATE POLICY "Anyone can read navigator usage"
  ON public.navigator_usage_logs FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE INDEX idx_navigator_usage_profile ON public.navigator_usage_logs(citizen_profile_id);
CREATE INDEX idx_navigator_usage_category ON public.navigator_usage_logs(goal_category);