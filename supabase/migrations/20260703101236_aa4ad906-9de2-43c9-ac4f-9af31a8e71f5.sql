
-- 1. Fix group-media storage policies to check uploaded file's path
DROP POLICY IF EXISTS "Advisor uploads own group-media" ON storage.objects;
DROP POLICY IF EXISTS "Advisor updates own group-media" ON storage.objects;
DROP POLICY IF EXISTS "Advisor deletes own group-media" ON storage.objects;

CREATE POLICY "Advisor uploads own group-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = g.id::text
  )
);

CREATE POLICY "Advisor updates own group-media"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = g.id::text
  )
);

CREATE POLICY "Advisor deletes own group-media"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'group-media'
  AND EXISTS (
    SELECT 1 FROM public.groups g
    JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid()
      AND (storage.foldername(storage.objects.name))[1] = g.id::text
  )
);

-- 2. Pin search_path on email queue helper functions
ALTER FUNCTION public.enqueue_email(text, jsonb) SET search_path = public, pgmq;
ALTER FUNCTION public.read_email_batch(text, integer, integer) SET search_path = public, pgmq;
ALTER FUNCTION public.delete_email(text, bigint) SET search_path = public, pgmq;
ALTER FUNCTION public.move_to_dlq(text, text, bigint, jsonb) SET search_path = public, pgmq;
