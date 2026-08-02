-- Policies on advisors, courses and signals are evaluated for the `public` role
-- (i.e. also for signed-out visitors) and call these helper predicates, so the
-- calling role needs EXECUTE or every public read fails with 42501.
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_auth_user_email_verified(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.current_creator_id() TO anon, authenticated;