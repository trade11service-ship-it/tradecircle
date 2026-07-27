-- Path layout: compliance-vault/{advisor_id}/{onboarding_id}.pdf
CREATE POLICY "Advisors read own vault files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-vault'
    AND EXISTS (
      SELECT 1 FROM public.advisors a
      WHERE a.user_id = auth.uid()
        AND a.id::text = (storage.foldername(name))[1]
    )
  );

CREATE POLICY "Clients read own vault files"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'compliance-vault'
    AND EXISTS (
      SELECT 1 FROM public.client_onboarding co
      WHERE co.user_id = auth.uid()
        AND co.id::text = replace((storage.filename(name)), '.pdf', '')
    )
  );

CREATE POLICY "Admins read all vault files"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'compliance-vault' AND public.is_admin(auth.uid()));