
-- Storage cleanup can no longer run via direct DELETE on storage.objects (blocked by Supabase).
-- Convert delete_kyc_files_for_user into a no-op so admin_reject_application and
-- expire_stale_applications complete successfully. Actual file removal is performed
-- by the client via the Storage API (admin) and can be handled by a scheduled job separately.
CREATE OR REPLACE FUNCTION public.delete_kyc_files_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Intentionally a no-op. Storage object removal is handled through the Storage API.
  RETURN;
END;
$$;
