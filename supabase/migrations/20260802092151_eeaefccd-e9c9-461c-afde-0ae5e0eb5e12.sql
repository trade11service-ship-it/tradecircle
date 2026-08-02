-- Safe helper so the public courses policy no longer needs read access on creator_profiles
CREATE OR REPLACE FUNCTION public.is_live_creator(_creator_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.creator_profiles c
    WHERE c.id = _creator_id AND c.kyc_status = 'approved'
  );
$$;

REVOKE ALL ON FUNCTION public.is_live_creator(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_live_creator(uuid) TO anon, authenticated, service_role;

DROP POLICY IF EXISTS "Public read live courses" ON public.courses;
CREATE POLICY "Public read live courses" ON public.courses
FOR SELECT
USING (
  (review_status = 'approved'::course_review_status
   AND is_visible = true
   AND public.is_live_creator(creator_id))
  OR creator_id = public.current_creator_id()
  OR public.is_admin(auth.uid())
);

-- Creators must be able to read their own studio profile. Banking columns
-- (bank_account_number, bank_ifsc, bank_account_holder_name, encrypted_pan,
-- payout_vendor_id) stay ungranted so they are never readable via the API.
GRANT SELECT (
  id, user_id, full_legal_name, email, phone, pan_masked,
  instagram_handle, youtube_channel, kyc_status, rejection_reason,
  created_at, updated_at
) ON public.creator_profiles TO authenticated;