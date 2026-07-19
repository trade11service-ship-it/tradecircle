
-- 1) Add user_id column to advisor_legal_acceptances for explicit audit
ALTER TABLE public.advisor_legal_acceptances
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- 2) Allow the application owner to insert a legal acceptance tied to their
-- pending application (currently only advisors row owners can insert, but
-- during registration there is no advisors row yet, so consent was silently
-- rejected by RLS).
DROP POLICY IF EXISTS "Insert advisor legal acceptance via application" ON public.advisor_legal_acceptances;
CREATE POLICY "Insert advisor legal acceptance via application"
  ON public.advisor_legal_acceptances FOR INSERT TO authenticated
  WITH CHECK (
    application_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.advisor_applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "Read own legal acceptance via application" ON public.advisor_legal_acceptances;
CREATE POLICY "Read own legal acceptance via application"
  ON public.advisor_legal_acceptances FOR SELECT TO authenticated
  USING (
    application_id IS NOT NULL AND EXISTS (
      SELECT 1 FROM public.advisor_applications a
      WHERE a.id = application_id AND a.user_id = auth.uid()
    )
  );

-- 3) On approval: link the acceptance row to the new advisor, and enqueue
--    a welcome email row in email_send_log while firing the send function.
CREATE OR REPLACE FUNCTION public.admin_approve_application(_app_id uuid)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _app public.advisor_applications%ROWTYPE;
  _new_advisor_id uuid;
  _msg_id text;
  _svc text;
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

  -- Backfill the advisor_id on the previously-recorded consent row so
  -- future reads work through the advisor-owner RLS policy too.
  UPDATE public.advisor_legal_acceptances
     SET advisor_id = _new_advisor_id
   WHERE application_id = _app_id AND advisor_id IS NULL;

  -- Log the welcome email intent (single source of truth for audit).
  _msg_id := 'advisor-approval-' || _new_advisor_id::text;
  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
  VALUES (_msg_id, 'advisor-approval', _app.email, 'queued',
          jsonb_build_object('advisor_id', _new_advisor_id, 'full_name', _app.full_name))
  ON CONFLICT DO NOTHING;

  -- Best-effort dispatch to the send-advisor-approval-email edge function.
  BEGIN
    SELECT decrypted_secret INTO _svc
    FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key';
    IF _svc IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://uuiaijoxmhccbdqnfblo.supabase.co/functions/v1/send-advisor-approval-email',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || _svc,
          'X-Internal-Trigger', 'admin_approve_application'
        ),
        body := jsonb_build_object(
          'advisor_id', _new_advisor_id,
          'email', _app.email,
          'full_name', _app.full_name,
          'message_id', _msg_id
        )
      );
    END IF;
  EXCEPTION WHEN OTHERS THEN
    -- Never block approval on email dispatch failure.
    RAISE WARNING 'admin_approve_application email dispatch failed: %', SQLERRM;
  END;

  RETURN _new_advisor_id;
END;
$function$;
