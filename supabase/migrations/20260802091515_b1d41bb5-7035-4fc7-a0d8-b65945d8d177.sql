-- Creator profiles: drop public row access and revoke sensitive columns
DROP POLICY IF EXISTS "Public read approved creators" ON public.creator_profiles;

REVOKE SELECT ON public.creator_profiles FROM anon, authenticated;
GRANT SELECT (
  id, user_id, full_legal_name, instagram_handle, youtube_channel,
  kyc_status, rejection_reason, created_at, updated_at, email, phone, pan_masked
) ON public.creator_profiles TO authenticated;

-- Groups: hide advisor payment endpoint/credentials from client roles
REVOKE SELECT (advisor_payment_url) ON public.groups FROM anon, authenticated;