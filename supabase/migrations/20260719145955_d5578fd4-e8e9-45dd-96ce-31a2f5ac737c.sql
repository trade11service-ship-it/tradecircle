
DROP POLICY IF EXISTS "Advisor uploads own group-media" ON storage.objects;
DROP POLICY IF EXISTS "Advisor updates own group-media" ON storage.objects;
DROP POLICY IF EXISTS "Advisor deletes own group-media" ON storage.objects;

CREATE POLICY "Advisor uploads own group-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = a.id::text
  )
);

CREATE POLICY "Advisor updates own group-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = a.id::text
  )
);

CREATE POLICY "Advisor deletes own group-media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = a.id::text
  )
);
