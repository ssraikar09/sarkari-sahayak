-- Remove public SELECT and INSERT policies on navigator_usage_logs.
-- Writes are performed exclusively via supabaseAdmin (service role bypasses RLS),
-- and no client reads this table.
DROP POLICY IF EXISTS "Anyone can read navigator usage" ON public.navigator_usage_logs;
DROP POLICY IF EXISTS "Anyone can log navigator usage" ON public.navigator_usage_logs;
