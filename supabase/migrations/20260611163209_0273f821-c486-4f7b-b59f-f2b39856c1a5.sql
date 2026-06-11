
DROP POLICY IF EXISTS "Anyone can insert citizen profiles" ON public.citizen_profiles;
DROP POLICY IF EXISTS "Anyone can log unsuccessful searches" ON public.scheme_search_logs;

REVOKE INSERT ON public.citizen_profiles FROM anon, authenticated;
REVOKE INSERT ON public.scheme_search_logs FROM anon, authenticated;

GRANT ALL ON public.scheme_search_logs TO service_role;
