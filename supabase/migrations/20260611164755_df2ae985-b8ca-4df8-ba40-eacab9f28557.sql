CREATE TABLE public.application_guide_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  citizen_profile_id uuid REFERENCES public.citizen_profiles(id) ON DELETE CASCADE,
  scheme_id uuid NOT NULL REFERENCES public.government_schemes(id) ON DELETE CASCADE,
  accessed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.application_guide_usage TO service_role;

ALTER TABLE public.application_guide_usage ENABLE ROW LEVEL SECURITY;

CREATE INDEX idx_application_guide_usage_scheme ON public.application_guide_usage(scheme_id);
CREATE INDEX idx_application_guide_usage_profile ON public.application_guide_usage(citizen_profile_id);