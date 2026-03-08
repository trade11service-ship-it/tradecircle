
-- Fix overly permissive INSERT policy on referral_visits
-- Allow both authenticated and anonymous users to insert visits (tracking)
-- but require that user_id matches auth.uid() if provided
DROP POLICY IF EXISTS "Anyone insert referral visits" ON public.referral_visits;

CREATE POLICY "Insert referral visits"
ON public.referral_visits
FOR INSERT
TO authenticated, anon
WITH CHECK (
  user_id IS NULL OR user_id = auth.uid()
);
