DROP POLICY IF EXISTS "Public read group-media" ON storage.objects;

DROP POLICY IF EXISTS "Advisor lists own group-media" ON storage.objects;
CREATE POLICY "Advisor lists own group-media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(objects.name))[1] = a.id::text
  )
);

DROP POLICY IF EXISTS "Creator lists own group-media" ON storage.objects;
CREATE POLICY "Creator lists own group-media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.creator_profiles c
    WHERE c.user_id = auth.uid()
      AND (storage.foldername(objects.name))[1] = c.id::text
  )
);

DROP POLICY IF EXISTS "Authenticated users only realtime" ON realtime.messages;