
ALTER TABLE public.government_schemes
  ADD COLUMN scheme_scope TEXT NOT NULL DEFAULT 'State'
  CHECK (scheme_scope IN ('National', 'State'));

CREATE INDEX idx_schemes_scope ON public.government_schemes(scheme_scope);
