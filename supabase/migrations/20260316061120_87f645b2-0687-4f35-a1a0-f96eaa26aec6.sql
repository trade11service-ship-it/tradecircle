ALTER TABLE public.advisors ADD COLUMN IF NOT EXISTS cover_image_url text;

INSERT INTO storage.buckets (id, name, public) VALUES ('advisor-covers', 'advisor-covers', true) ON CONFLICT (id) DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('advisor-avatars', 'advisor-avatars', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Anyone can read advisor covers" ON storage.objects FOR SELECT TO public USING (bucket_id = 'advisor-covers');
CREATE POLICY "Advisors upload own covers" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'advisor-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Advisors update own covers" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'advisor-covers' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Advisors delete own covers" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'advisor-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Anyone can read advisor avatars" ON storage.objects FOR SELECT TO public USING (bucket_id = 'advisor-avatars');
CREATE POLICY "Advisors upload own avatars" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'advisor-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Advisors update own avatars" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'advisor-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "Advisors delete own avatars" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'advisor-avatars' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "View signals" ON public.signals;
CREATE POLICY "View signals" ON public.signals FOR SELECT TO public
USING (
  (signal_date < CURRENT_DATE)
  OR (EXISTS (SELECT 1 FROM subscriptions WHERE subscriptions.user_id = auth.uid() AND subscriptions.group_id = signals.group_id AND subscriptions.status = 'active' AND subscriptions.end_date >= now()))
  OR (EXISTS (SELECT 1 FROM advisors WHERE advisors.id = signals.advisor_id AND advisors.user_id = auth.uid()))
  OR ((is_public = true) AND (post_type = 'message') AND (EXISTS (SELECT 1 FROM group_follows WHERE group_follows.user_id = auth.uid() AND group_follows.group_id = signals.group_id)))
  OR is_admin(auth.uid())
);

DROP POLICY IF EXISTS "View approved or own advisors" ON public.advisors;
CREATE POLICY "View approved or own advisors" ON public.advisors FOR SELECT TO public
USING (status = 'approved' OR auth.uid() = user_id OR is_admin(auth.uid()));