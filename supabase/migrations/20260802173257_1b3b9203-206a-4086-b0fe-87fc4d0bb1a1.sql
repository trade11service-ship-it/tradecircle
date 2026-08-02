-- 1. Drop Aadhaar everywhere
ALTER TABLE public.advisor_applications DROP COLUMN IF EXISTS aadhaar_number;
ALTER TABLE public.advisors DROP COLUMN IF EXISTS aadhaar_no;
ALTER TABLE public.advisors DROP COLUMN IF EXISTS aadhaar_photo_url;
ALTER TABLE public.rejected_advisor_applications DROP COLUMN IF EXISTS aadhaar_no;

-- 2. New application status machine
ALTER TABLE public.advisor_applications DROP CONSTRAINT IF EXISTS advisor_applications_status_check;
UPDATE public.advisor_applications SET status = 'pending_offline_review' WHERE status = 'pending';
ALTER TABLE public.advisor_applications ADD CONSTRAINT advisor_applications_status_check
  CHECK (status = ANY (ARRAY['pending_offline_review','pre_approved','approved','rejected','expired']));
ALTER TABLE public.advisor_applications ALTER COLUMN status SET DEFAULT 'pending_offline_review';

-- 3. Advisor deferred KYC columns
ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS kyc_status text NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS pan_masked text,
  ADD COLUMN IF NOT EXISTS encrypted_pan text,
  ADD COLUMN IF NOT EXISTS bank_account_number text,
  ADD COLUMN IF NOT EXISTS bank_ifsc text,
  ADD COLUMN IF NOT EXISTS bank_account_holder_name text,
  ADD COLUMN IF NOT EXISTS payout_vendor_id text,
  ADD COLUMN IF NOT EXISTS kyc_rejection_reason text,
  ADD COLUMN IF NOT EXISTS kyc_updated_at timestamptz;

ALTER TABLE public.advisors DROP CONSTRAINT IF EXISTS advisors_kyc_status_check;
ALTER TABLE public.advisors ADD CONSTRAINT advisors_kyc_status_check
  CHECK (kyc_status = ANY (ARRAY['unverified','pending','approved','rejected']));

ALTER TABLE public.advisors DROP CONSTRAINT IF EXISTS advisors_status_check;
ALTER TABLE public.advisors ADD CONSTRAINT advisors_status_check
  CHECK (status = ANY (ARRAY['pending','pre_approved','approved','rejected','suspended']));

-- Existing approved advisors keep working: treat them as already verified.
UPDATE public.advisors SET kyc_status = 'approved' WHERE status = 'approved' AND kyc_status = 'unverified';

-- Grant only the non-sensitive new column publicly (kyc_status drives UI badges for owners only)
GRANT SELECT (kyc_status) ON public.advisors TO authenticated;

-- 4. PII-free KYC audit trail
CREATE TABLE IF NOT EXISTS public.kyc_audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject_type text NOT NULL CHECK (subject_type = ANY (ARRAY['advisor','creator','client'])),
  subject_id uuid,
  check_type text NOT NULL CHECK (check_type = ANY (ARRAY['pan','penny_drop'])),
  provider text NOT NULL DEFAULT 'sandbox',
  transaction_id text,
  status_verdict text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.kyc_audit_events TO authenticated;
GRANT ALL ON public.kyc_audit_events TO service_role;
ALTER TABLE public.kyc_audit_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read kyc audit" ON public.kyc_audit_events
  FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));

-- 5. Group creation gate: fully approved + verified advisors only
DROP POLICY IF EXISTS "Advisor insert own groups" ON public.groups;
CREATE POLICY "Advisor insert own groups" ON public.groups
  FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.id = groups.advisor_id
      AND a.user_id = auth.uid()
      AND a.status = 'approved'
      AND a.kyc_status = 'approved'
  ));

-- 6. Pre-approval RPC replaces direct approval
CREATE OR REPLACE FUNCTION public.admin_pre_approve_application(_app_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _app public.advisor_applications%ROWTYPE;
  _new_advisor_id uuid;
  _msg_id text;
  _html text;
  _text text;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT * INTO _app FROM public.advisor_applications WHERE id = _app_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'application not found'; END IF;
  IF _app.status <> 'pending_offline_review' THEN RAISE EXCEPTION 'application is not awaiting offline review'; END IF;

  INSERT INTO public.advisors (
    user_id, full_name, email, phone, address,
    sebi_reg_no, bio, strategy_type, status, kyc_status
  ) VALUES (
    _app.user_id, _app.full_name, _app.email, _app.phone, _app.address,
    _app.sebi_number, _app.bio, _app.strategy_type, 'pre_approved', 'unverified'
  )
  RETURNING id INTO _new_advisor_id;

  UPDATE public.profiles SET role = 'advisor' WHERE id = _app.user_id;

  UPDATE public.advisor_applications
  SET status = 'pre_approved',
      pan_number = NULL,
      reviewed_at = now(),
      reviewed_by = auth.uid()
  WHERE id = _app_id;

  UPDATE public.advisor_legal_acceptances
     SET advisor_id = _new_advisor_id
   WHERE application_id = _app_id AND advisor_id IS NULL;

  _msg_id := 'advisor-preapproval-' || _new_advisor_id::text;
  _html := '<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:24px">'
    || '<div style="border-bottom:3px solid #0EA5E9;padding-bottom:16px;margin-bottom:24px"><h1 style="margin:0;color:#1F2937">RA Circle</h1><p style="margin:6px 0 0;color:#64748B">Advisor verification update</p></div>'
    || '<h2 style="color:#10B981;margin:0 0 12px">Good news, ' || coalesce(_app.full_name, 'Advisor') || '!</h2>'
    || '<p>Your SEBI registration has been manually verified and your RA Circle advisor profile is now <strong>pre-approved</strong>.</p>'
    || '<p>One step remains: complete PAN and bank account verification inside your dashboard to unlock group creation and payouts.</p>'
    || '<p style="margin:28px 0"><a href="https://racircle.in/advisor/dashboard" style="background:#0EA5E9;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Complete Verification</a></p>'
    || '<p style="font-size:12px;color:#64748B;border-top:1px solid #e5e7eb;padding-top:16px">PAN and bank details are verified through Digio, our authorised verification partner, and stored encrypted.</p>'
    || '</div>';
  _text := 'Good news, ' || coalesce(_app.full_name, 'Advisor') || '! Your RA Circle advisor profile is pre-approved. Complete PAN and bank verification in your dashboard: https://racircle.in/advisor/dashboard';

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
  VALUES (_msg_id, 'advisor-pre-approval', _app.email, 'queued',
          jsonb_build_object('advisor_id', _new_advisor_id, 'full_name', _app.full_name))
  ON CONFLICT DO NOTHING;

  BEGIN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id', _msg_id,
      'to', _app.email,
      'from', 'notify@notify.racircle.in',
      'sender_domain', 'notify.racircle.in',
      'subject', 'Your RA Circle Advisor Profile Is Pre-Approved',
      'html', _html,
      'text', _text,
      'purpose', 'transactional',
      'label', 'advisor-pre-approval',
      'idempotency_key', _msg_id,
      'queued_at', now()
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_pre_approve_application email queue failed: %', SQLERRM;
  END;

  RETURN _new_advisor_id;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_pre_approve_application(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_pre_approve_application(uuid) TO authenticated;

-- Retire the old direct-approval path
CREATE OR REPLACE FUNCTION public.admin_approve_application(_app_id uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  RAISE EXCEPTION 'admin_approve_application is retired; use admin_pre_approve_application';
END;
$function$;

-- 7. Offline review queue listing
CREATE OR REPLACE FUNCTION public.admin_list_pending_applications()
RETURNS SETOF public.advisor_applications
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;
  RETURN QUERY
    SELECT * FROM public.advisor_applications
    WHERE status = 'pending_offline_review'
    ORDER BY created_at DESC;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_list_awaiting_kyc_advisors()
RETURNS TABLE(id uuid, full_name text, email text, sebi_reg_no text, kyc_status text, kyc_rejection_reason text, created_at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
    SELECT a.id, a.full_name, a.email, a.sebi_reg_no, a.kyc_status, a.kyc_rejection_reason, a.created_at
    FROM public.advisors a
    WHERE a.status = 'pre_approved'
    ORDER BY a.created_at DESC;
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_list_awaiting_kyc_advisors() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_awaiting_kyc_advisors() TO authenticated;

-- 8. Stale application expiry (no more aadhaar column)
CREATE OR REPLACE FUNCTION public.expire_stale_applications()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _rec record;
  _count integer := 0;
BEGIN
  FOR _rec IN
    SELECT id, user_id FROM public.advisor_applications
    WHERE status = 'pending_offline_review' AND created_at < now() - interval '60 days'
  LOOP
    UPDATE public.advisor_applications
    SET status = 'expired',
        pan_number = NULL,
        reviewed_at = now()
    WHERE id = _rec.id;
    PERFORM public.delete_kyc_files_for_user(_rec.user_id);
    _count := _count + 1;
  END LOOP;
  RETURN _count;
END;
$function$;

-- 9. 60-day scrub of failed / abandoned KYC data
CREATE OR REPLACE FUNCTION public.scrub_stale_kyc()
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE _n integer := 0; _m integer := 0;
BEGIN
  UPDATE public.advisors
  SET encrypted_pan = NULL, pan_masked = NULL, bank_account_number = NULL,
      bank_ifsc = NULL, bank_account_holder_name = NULL
  WHERE kyc_status IN ('rejected','unverified','pending')
    AND (encrypted_pan IS NOT NULL OR bank_account_number IS NOT NULL)
    AND COALESCE(kyc_updated_at, created_at) < now() - interval '60 days';
  GET DIAGNOSTICS _n = ROW_COUNT;

  UPDATE public.creator_profiles
  SET encrypted_pan = NULL, pan_masked = NULL, bank_account_number = NULL,
      bank_ifsc = NULL, bank_account_holder_name = NULL
  WHERE kyc_status IN ('rejected','pending')
    AND (encrypted_pan IS NOT NULL OR bank_account_number IS NOT NULL)
    AND updated_at < now() - interval '60 days';
  GET DIAGNOSTICS _m = ROW_COUNT;

  UPDATE public.client_onboarding
  SET encrypted_pan = NULL, pan_masked = NULL
  WHERE payment_status <> 'captured'
    AND encrypted_pan IS NOT NULL
    AND created_at < now() - interval '60 days';

  RETURN _n + _m;
END;
$function$;

REVOKE ALL ON FUNCTION public.scrub_stale_kyc() FROM PUBLIC, anon, authenticated;

SELECT cron.unschedule('scrub-stale-kyc') WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'scrub-stale-kyc');
SELECT cron.schedule('scrub-stale-kyc', '30 2 * * *', $cron$ SELECT public.scrub_stale_kyc(); $cron$);