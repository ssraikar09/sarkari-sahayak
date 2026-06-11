
-- citizen_profiles: keep INSERT (onboarding), drop public SELECT
DROP POLICY IF EXISTS "Anyone can view citizen profiles" ON public.citizen_profiles;

-- family_members: drop all public access (now via server functions)
DROP POLICY IF EXISTS "Anyone can view family members" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can add family members" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can update family members" ON public.family_members;
DROP POLICY IF EXISTS "Anyone can delete family members" ON public.family_members;

-- assistant_queries: drop all public access
DROP POLICY IF EXISTS "Anyone can view assistant queries" ON public.assistant_queries;
DROP POLICY IF EXISTS "Anyone can record assistant queries" ON public.assistant_queries;

-- eligibility_assessments: drop all public access
DROP POLICY IF EXISTS "Anyone can view eligibility assessments" ON public.eligibility_assessments;
DROP POLICY IF EXISTS "Anyone can record eligibility assessments" ON public.eligibility_assessments;

-- Revoke direct table privileges from anon/authenticated; rely on server functions (service_role)
REVOKE SELECT, UPDATE, DELETE ON public.citizen_profiles FROM anon, authenticated;
REVOKE ALL ON public.family_members FROM anon, authenticated;
REVOKE SELECT, UPDATE, DELETE ON public.assistant_queries FROM anon, authenticated;
REVOKE ALL ON public.eligibility_assessments FROM anon, authenticated;

-- Ensure service_role retains full access
GRANT ALL ON public.citizen_profiles TO service_role;
GRANT ALL ON public.family_members TO service_role;
GRANT ALL ON public.assistant_queries TO service_role;
GRANT ALL ON public.eligibility_assessments TO service_role;
