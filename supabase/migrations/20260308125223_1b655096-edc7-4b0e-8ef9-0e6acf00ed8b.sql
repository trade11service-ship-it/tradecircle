
-- Allow authenticated users to upload to group-media bucket
CREATE POLICY "Authenticated users can upload to group-media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'group-media');

-- Allow public read access to group-media bucket
CREATE POLICY "Public read access to group-media"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'group-media');

-- Allow authenticated users to update their uploads
CREATE POLICY "Authenticated users can update group-media"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'group-media');

-- Allow authenticated users to delete their uploads
CREATE POLICY "Authenticated users can delete group-media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'group-media');
