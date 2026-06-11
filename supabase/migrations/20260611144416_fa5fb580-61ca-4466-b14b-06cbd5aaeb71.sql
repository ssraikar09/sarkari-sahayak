CREATE TABLE public.scheme_search_logs (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_query text NOT NULL,
  state_selected text,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT INSERT ON public.scheme_search_logs TO anon, authenticated;
GRANT ALL ON public.scheme_search_logs TO service_role;

ALTER TABLE public.scheme_search_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can log unsuccessful searches"
  ON public.scheme_search_logs
  FOR INSERT
  TO anon, authenticated
  WITH CHECK (true);