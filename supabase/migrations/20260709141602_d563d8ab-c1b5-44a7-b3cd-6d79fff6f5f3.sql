-- Revoke broad SELECT on sensitive table from application-facing roles
REVOKE SELECT ON public.advisor_applications FROM authenticated;
REVOKE SELECT ON public.advisor_applications FROM anon;

-- Grant SELECT only on non-sensitive, user-facing status/metadata columns
GRANT SELECT (
  id,
  user_id,
  status,
  rejection_reason,
  reviewed_at,
  reviewed_by,
  created_at,
  updated_at
) ON public.advisor_applications TO authenticated;

-- Edge functions and admin helpers use service_role
GRANT ALL ON public.advisor_applications TO service_role;

-- Ensure anon has no access to this auth-only table
REVOKE ALL ON public.advisor_applications FROM anon;