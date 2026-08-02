-- 1. Lock down SECURITY DEFINER / all public functions
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;

GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Public (anonymous) read-only surface
GRANT EXECUTE ON FUNCTION public.list_public_courses() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_public_course(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_course_syllabus(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_group_feed_posts(uuid, integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_live_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_signal_stats(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_subscriber_count(uuid) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_referral_link_by_code(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referral_clicks(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referral_signups(text) TO anon, authenticated;

-- Signed-in only surface (each function performs its own authorization checks)
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_auth_user_email_verified(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.current_creator_id() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_full(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_full_by_user(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_earnings(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_referral_dashboard(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referral_conversions(text, integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_advisors(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_rejected_applications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_pending_courses() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_application(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_application(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_advisor(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_review_course(uuid, boolean, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_profile(uuid) TO authenticated;

-- 2. Public buckets: remove blanket listing policies (public URLs still work)
DROP POLICY IF EXISTS "Anyone can read advisor avatars" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read advisor covers" ON storage.objects;
DROP POLICY IF EXISTS "Public read access to group-media" ON storage.objects;

-- 3. Realtime channels require an authenticated session
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
             WHERE n.nspname = 'realtime' AND c.relname = 'messages') THEN
    EXECUTE 'DROP POLICY IF EXISTS "Authenticated users only realtime" ON realtime.messages';
    EXECUTE 'CREATE POLICY "Authenticated users only realtime" ON realtime.messages FOR SELECT TO authenticated USING (auth.uid() IS NOT NULL)';
  END IF;
END $$;