-- Public bucket: allow reads at the table level so upsert/list paths work
DROP POLICY IF EXISTS "Public read group-media" ON storage.objects;
CREATE POLICY "Public read group-media"
ON storage.objects FOR SELECT
TO anon, authenticated
USING (bucket_id = 'group-media');

-- Creators may delete/replace their own course cover files
DROP POLICY IF EXISTS "Creators delete course covers" ON storage.objects;
CREATE POLICY "Creators delete course covers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'group-media'
  AND (storage.foldername(name))[1] = 'course-covers'
  AND (storage.foldername(name))[2] = (public.current_creator_id())::text
);