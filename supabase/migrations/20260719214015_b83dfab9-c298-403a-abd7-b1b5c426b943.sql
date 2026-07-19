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
  _html text;
  _text text;
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

  UPDATE public.advisor_legal_acceptances
     SET advisor_id = _new_advisor_id
   WHERE application_id = _app_id AND advisor_id IS NULL;

  _msg_id := 'advisor-approval-' || _new_advisor_id::text;
  _html := '<div style="font-family:Arial,sans-serif;color:#1f2937;max-width:640px;margin:0 auto;padding:24px">'
    || '<div style="border-bottom:3px solid #0EA5E9;padding-bottom:16px;margin-bottom:24px"><h1 style="margin:0;color:#1F2937">RA Circle</h1><p style="margin:6px 0 0;color:#64748B">Advisor verification update</p></div>'
    || '<h2 style="color:#10B981;margin:0 0 12px">Congratulations, ' || coalesce(_app.full_name, 'Advisor') || '!</h2>'
    || '<p>Your RA Circle advisor application has been <strong>approved</strong>.</p>'
    || '<p>You can now sign in to your advisor dashboard, create groups, post signals, and manage subscribers.</p>'
    || '<p style="margin:28px 0"><a href="https://racircle.in/advisor/dashboard" style="background:#0EA5E9;color:#fff;padding:12px 20px;border-radius:10px;text-decoration:none;font-weight:700">Open Advisor Dashboard</a></p>'
    || '<p style="font-size:12px;color:#64748B;border-top:1px solid #e5e7eb;padding-top:16px">SEBI compliance note: you remain responsible for all regulatory obligations and signal accuracy on RA Circle.</p>'
    || '</div>';
  _text := 'Congratulations, ' || coalesce(_app.full_name, 'Advisor') || '! Your RA Circle advisor application has been approved. Open your dashboard: https://racircle.in/advisor/dashboard';

  INSERT INTO public.email_send_log (message_id, template_name, recipient_email, status, metadata)
  VALUES (_msg_id, 'advisor-approval', _app.email, 'queued',
          jsonb_build_object('advisor_id', _new_advisor_id, 'full_name', _app.full_name))
  ON CONFLICT DO NOTHING;

  BEGIN
    PERFORM public.enqueue_email('transactional_emails', jsonb_build_object(
      'message_id', _msg_id,
      'to', _app.email,
      'from', 'notify@notify.racircle.in',
      'sender_domain', 'notify.racircle.in',
      'subject', 'Your RA Circle Advisor Account Has Been Approved',
      'html', _html,
      'text', _text,
      'purpose', 'transactional',
      'label', 'advisor-approval',
      'idempotency_key', _msg_id,
      'queued_at', now()
    ));
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'admin_approve_application email queue failed: %', SQLERRM;
  END;

  RETURN _new_advisor_id;
END;
$function$;

DO $repair$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'pg_cron') THEN
    IF NOT EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'process-email-queue') THEN
      PERFORM cron.schedule(
        'process-email-queue',
        '*/1 * * * *',
        $cmd$SELECT net.http_post(
          url := 'https://uuiaijoxmhccbdqnfblo.supabase.co/functions/v1/process-email-queue',
          headers := jsonb_build_object(
            'Content-Type', 'application/json',
            'Authorization', 'Bearer ' || (SELECT decrypted_secret FROM vault.decrypted_secrets WHERE name = 'email_queue_service_role_key')
          ),
          body := jsonb_build_object('source', 'cron')
        );$cmd$
      );
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'process-email-queue cron repair skipped: %', SQLERRM;
END
$repair$;