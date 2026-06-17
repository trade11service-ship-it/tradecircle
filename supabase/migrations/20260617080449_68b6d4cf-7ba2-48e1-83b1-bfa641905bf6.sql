
-- 1. Signals: remove time-decay paywall bypass
DROP POLICY IF EXISTS "View signals" ON public.signals;
CREATE POLICY "View signals" ON public.signals FOR SELECT USING (
  is_public = true
  OR EXISTS (
    SELECT 1 FROM public.subscriptions s
    WHERE s.user_id = auth.uid()
      AND s.group_id = signals.group_id
      AND s.status = 'active'
      AND (s.end_date IS NULL OR s.end_date >= now())
  )
  OR EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.id = signals.advisor_id AND a.user_id = auth.uid()
  )
  OR public.is_admin(auth.uid())
);

-- 2. Advisor PII: column-level revoke
REVOKE SELECT (pan_no, aadhaar_no, phone, email, address, pan_photo_url, aadhaar_photo_url)
  ON public.advisors FROM anon, authenticated;

-- 3. SECURITY DEFINER accessor for own/admin full advisor
CREATE OR REPLACE FUNCTION public.get_advisor_full(_advisor_id uuid)
RETURNS SETOF public.advisors
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid())
     OR EXISTS (SELECT 1 FROM public.advisors WHERE id = _advisor_id AND user_id = auth.uid()) THEN
    RETURN QUERY SELECT * FROM public.advisors WHERE id = _advisor_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_advisor_full(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.get_advisor_full_by_user(_user_id uuid)
RETURNS SETOF public.advisors
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.uid() = _user_id THEN
    RETURN QUERY SELECT * FROM public.advisors WHERE user_id = _user_id;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.get_advisor_full_by_user(uuid) TO authenticated;

-- Admin-only listing with PII
CREATE OR REPLACE FUNCTION public.admin_list_advisors(_status text DEFAULT NULL)
RETURNS SETOF public.advisors
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  IF _status IS NULL THEN
    RETURN QUERY SELECT * FROM public.advisors ORDER BY created_at DESC;
  ELSE
    RETURN QUERY SELECT * FROM public.advisors WHERE status = _status ORDER BY created_at DESC;
  END IF;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_list_advisors(text) TO authenticated;

-- 4. group-media storage: lock writes to the owning advisor only
DROP POLICY IF EXISTS "Authenticated users can upload to group-media" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update group-media"     ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete group-media"     ON storage.objects;

CREATE POLICY "Advisor uploads own group-media" ON storage.objects FOR INSERT TO authenticated WITH CHECK (
  bucket_id = 'group-media' AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  )
);
CREATE POLICY "Advisor updates own group-media" ON storage.objects FOR UPDATE TO authenticated USING (
  bucket_id = 'group-media' AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  )
);
CREATE POLICY "Advisor deletes own group-media" ON storage.objects FOR DELETE TO authenticated USING (
  bucket_id = 'group-media' AND EXISTS (
    SELECT 1 FROM public.groups g JOIN public.advisors a ON a.id = g.advisor_id
    WHERE a.user_id = auth.uid() AND (storage.foldername(name))[1] = g.id::text
  )
);
