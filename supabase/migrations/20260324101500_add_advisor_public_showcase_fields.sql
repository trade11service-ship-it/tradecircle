-- Admin-managed public showcase metadata for advisor cards/landing section
ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS is_public_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS public_sort_order integer DEFAULT 999,
  ADD COLUMN IF NOT EXISTS public_tagline text,
  ADD COLUMN IF NOT EXISTS public_description text,
  ADD COLUMN IF NOT EXISTS public_years_experience integer;

