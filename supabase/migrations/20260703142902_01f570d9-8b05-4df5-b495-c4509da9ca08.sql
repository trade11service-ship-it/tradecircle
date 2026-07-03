
CREATE TABLE IF NOT EXISTS public.advisor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  sebi_number text NOT NULL,
  pan_number text,
  aadhaar_number text,
  address text,
  bio text,
  strategy_type text,
  status text NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','approved','rejected','expired')),
  rejection_reason text,
  reviewed_at timestamptz,
  reviewed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.advisor_applications TO authenticated;
GRANT ALL ON public.advisor_applications TO service_role;

ALTER TABLE public.advisor_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own application"
  ON public.advisor_applications FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own application"
  ON public.advisor_applications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id OR public.is_admin(auth.uid()));

CREATE POLICY "Admins update applications"
  ON public.advisor_applications FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Admins delete applications"
  ON public.advisor_applications FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.set_updated_at_advisor_apps()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_advisor_apps_updated ON public.advisor_applications;
CREATE TRIGGER trg_advisor_apps_updated
  BEFORE UPDATE ON public.advisor_applications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_advisor_apps();

-- Legal acceptance: DPDP consent + optional link to application row
ALTER TABLE public.advisor_legal_acceptances
  ALTER COLUMN advisor_id DROP NOT NULL;

ALTER TABLE public.advisor_legal_acceptances
  ADD COLUMN IF NOT EXISTS application_id uuid REFERENCES public.advisor_applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS checkbox_3_dpdp_consent boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS checkbox_3_text text,
  ADD COLUMN IF NOT EXISTS checkbox_3_accepted_at timestamptz;

-- KYC storage cleanup helper
CREATE OR REPLACE FUNCTION public.delete_kyc_files_for_user(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  DELETE FROM storage.objects
  WHERE bucket_id = 'kyc-documents'
    AND name LIKE _user_id::text || '%';
END;
$$;

-- Admin RPCs
CREATE OR REPLACE FUNCTION public.admin_list_pending_applications()
RETURNS SETOF public.advisor_applications
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.advisor_applications
    WHERE status = 'pending'
    ORDER BY created_at DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_approve_application(_app_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _app public.advisor_applications%ROWTYPE;
  _new_advisor_id uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _app FROM public.advisor_applications WHERE id = _app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF _app.status <> 'pending' THEN RAISE EXCEPTION 'application is not pending'; END IF;

  INSERT INTO public.advisors (
    user_id, full_name, email, phone, address,
    sebi_reg_no, pan_no, bio, strategy_type, status
  ) VALUES (
    _app.user_id, _app.full_name, _app.email, _app.phone, _app.address,
    _app.sebi_number, _app.pan_number, _app.bio, _app.strategy_type, 'approved'
  )
  RETURNING id INTO _new_advisor_id;

  UPDATE public.profiles SET role = 'advisor' WHERE id = _app.user_id;

  UPDATE public.advisor_applications
  SET status = 'approved',
      aadhaar_number = NULL,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = _app_id;

  RETURN _new_advisor_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_reject_application(_app_id uuid, _reason text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE _uid uuid;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT user_id INTO _uid FROM public.advisor_applications WHERE id = _app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;

  PERFORM public.delete_kyc_files_for_user(_uid);
  DELETE FROM public.advisor_applications WHERE id = _app_id;
END;
$$;

CREATE OR REPLACE FUNCTION public.expire_stale_applications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rec record;
  _count integer := 0;
BEGIN
  FOR _rec IN
    SELECT id, user_id FROM public.advisor_applications
    WHERE status = 'pending' AND created_at < now() - interval '60 days'
  LOOP
    UPDATE public.advisor_applications
    SET status = 'expired',
        pan_number = NULL,
        aadhaar_number = NULL,
        reviewed_at = now()
    WHERE id = _rec.id;
    PERFORM public.delete_kyc_files_for_user(_rec.user_id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$$;

-- DPDP sweep: legacy rejected archive
ALTER TABLE public.rejected_advisor_applications
  ALTER COLUMN pan_no DROP NOT NULL,
  ALTER COLUMN aadhaar_no DROP NOT NULL;

UPDATE public.rejected_advisor_applications
SET pan_no = NULL, aadhaar_no = NULL
WHERE pan_no IS NOT NULL OR aadhaar_no IS NOT NULL;

CREATE OR REPLACE FUNCTION public.admin_reject_advisor(_advisor_id uuid, _reason text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _a public.advisors%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _a FROM public.advisors WHERE id = _advisor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'advisor not found'; END IF;

  INSERT INTO public.rejected_advisor_applications (
    original_advisor_id, user_id, full_name, email, phone, sebi_reg_no,
    strategy_type, bio, rejection_reason, original_created_at, rejected_by
  ) VALUES (
    _a.id, _a.user_id, _a.full_name, _a.email, _a.phone, _a.sebi_reg_no,
    _a.strategy_type, _a.bio, COALESCE(_reason, 'No reason provided'),
    _a.created_at, auth.uid()
  );

  PERFORM public.delete_kyc_files_for_user(_a.user_id);
  DELETE FROM public.advisors WHERE id = _advisor_id;
  UPDATE public.profiles SET role = 'trader' WHERE id = _a.user_id AND role = 'advisor';
END; $function$;

-- Column-level PII lockdown on advisors table
REVOKE SELECT (pan_no, aadhaar_no, phone, email, address, pan_photo_url, aadhaar_photo_url)
  ON public.advisors FROM anon, authenticated;
