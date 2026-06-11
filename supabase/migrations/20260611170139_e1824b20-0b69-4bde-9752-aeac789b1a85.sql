CREATE TABLE public.official_link_fallback_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scheme_id uuid NOT NULL,
  fallback_type text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT ALL ON public.official_link_fallback_logs TO service_role;

ALTER TABLE public.official_link_fallback_logs ENABLE ROW LEVEL SECURITY;

-- No policies: access only via service role (server functions).
