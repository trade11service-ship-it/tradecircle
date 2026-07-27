-- Private course content: creator-owned folders keyed by creator profile id
CREATE POLICY "Creators upload own course content" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'courses-content'
    AND (storage.foldername(name))[1] = (public.current_creator_id())::text
  );

CREATE POLICY "Creators update own course content" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'courses-content'
    AND (storage.foldername(name))[1] = (public.current_creator_id())::text
  );

CREATE POLICY "Creators delete own course content" ON storage.objects
  FOR DELETE TO authenticated
  USING (
    bucket_id = 'courses-content'
    AND (storage.foldername(name))[1] = (public.current_creator_id())::text
  );

CREATE POLICY "Creators read own course content" ON storage.objects
  FOR SELECT TO authenticated
  USING (
    bucket_id = 'courses-content'
    AND ((storage.foldername(name))[1] = (public.current_creator_id())::text OR public.is_admin(auth.uid()))
  );

-- Public cover images live inside the existing public group-media bucket
CREATE POLICY "Creators upload course covers" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'group-media'
    AND (storage.foldername(name))[1] = 'course-covers'
    AND (storage.foldername(name))[2] = (public.current_creator_id())::text
  );

CREATE POLICY "Creators update course covers" ON storage.objects
  FOR UPDATE TO authenticated
  USING (
    bucket_id = 'group-media'
    AND (storage.foldername(name))[1] = 'course-covers'
    AND (storage.foldername(name))[2] = (public.current_creator_id())::text
  );