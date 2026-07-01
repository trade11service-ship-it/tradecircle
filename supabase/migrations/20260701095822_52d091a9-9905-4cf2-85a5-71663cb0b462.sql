
-- Preserve compliance rows when advisor row is deleted (rejection archive move)
ALTER TABLE public.advisor_legal_acceptances
  DROP CONSTRAINT IF EXISTS advisor_legal_acceptances_advisor_id_fkey;
ALTER TABLE public.advisor_legal_acceptances
  ALTER COLUMN advisor_id DROP NOT NULL;
ALTER TABLE public.advisor_legal_acceptances
  ADD CONSTRAINT advisor_legal_acceptances_advisor_id_fkey
  FOREIGN KEY (advisor_id) REFERENCES public.advisors(id) ON DELETE SET NULL;

-- =========================================================
-- 1. advisor_daily_earnings: precision + referral split
-- =========================================================
ALTER TABLE public.advisor_daily_earnings
  ALTER COLUMN gross_revenue TYPE NUMERIC(12,2) USING ROUND(gross_revenue::numeric, 2),
  ALTER COLUMN gst_amount    TYPE NUMERIC(12,2) USING ROUND(gst_amount::numeric, 2),
  ALTER COLUMN platform_fee  TYPE NUMERIC(12,2) USING ROUND(platform_fee::numeric, 2),
  ALTER COLUMN net_earning   TYPE NUMERIC(12,2) USING ROUND(net_earning::numeric, 2);

ALTER TABLE public.advisor_daily_earnings
  ADD COLUMN IF NOT EXISTS referral_gross       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS standard_gross       NUMERIC(12,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS referral_subs_count  INTEGER       NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.record_subscription_earning()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE
  _gross numeric; _gst numeric; _platform_fee_pct numeric; _platform_fee numeric; _net numeric;
  _is_ref boolean; _ref_gross numeric; _std_gross numeric; _ref_count int;
BEGIN
  _gross := ROUND(COALESCE(NEW.amount_paid, 0)::numeric, 2);
  _gst := ROUND(_gross * 0.18, 2);
  _is_ref := COALESCE(NEW.from_referral, false);
  _platform_fee_pct := COALESCE(NEW.platform_fee_percent, CASE WHEN _is_ref THEN 15 ELSE 30 END);
  _platform_fee := ROUND((_gross - _gst) * (_platform_fee_pct / 100.0), 2);
  _net := ROUND(_gross - _gst - _platform_fee, 2);
  _ref_gross := CASE WHEN _is_ref THEN _gross ELSE 0 END;
  _std_gross := CASE WHEN _is_ref THEN 0 ELSE _gross END;
  _ref_count := CASE WHEN _is_ref THEN 1 ELSE 0 END;

  INSERT INTO public.advisor_daily_earnings (
    advisor_id, earning_date, gross_revenue, gst_amount, platform_fee, net_earning,
    subscription_count, referral_gross, standard_gross, referral_subs_count)
  VALUES (NEW.advisor_id, COALESCE(NEW.start_date::date, CURRENT_DATE),
    _gross, _gst, _platform_fee, _net, 1, _ref_gross, _std_gross, _ref_count)
  ON CONFLICT (advisor_id, earning_date) DO UPDATE SET
    gross_revenue      = advisor_daily_earnings.gross_revenue + EXCLUDED.gross_revenue,
    gst_amount         = advisor_daily_earnings.gst_amount + EXCLUDED.gst_amount,
    platform_fee       = advisor_daily_earnings.platform_fee + EXCLUDED.platform_fee,
    net_earning        = advisor_daily_earnings.net_earning + EXCLUDED.net_earning,
    subscription_count = advisor_daily_earnings.subscription_count + 1,
    referral_gross     = advisor_daily_earnings.referral_gross + EXCLUDED.referral_gross,
    standard_gross     = advisor_daily_earnings.standard_gross + EXCLUDED.standard_gross,
    referral_subs_count= advisor_daily_earnings.referral_subs_count + EXCLUDED.referral_subs_count;
  RETURN NEW;
END; $$;

-- =========================================================
-- 2. Rejected advisor applications archive
-- =========================================================
CREATE TABLE IF NOT EXISTS public.rejected_advisor_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  original_advisor_id uuid,
  user_id uuid,
  full_name text,
  email text,
  phone text,
  sebi_reg_no text,
  pan_no text,
  aadhaar_no text,
  strategy_type text,
  bio text,
  rejection_reason text,
  original_created_at timestamptz,
  rejected_by uuid,
  rejected_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.rejected_advisor_applications TO authenticated;
GRANT ALL ON public.rejected_advisor_applications TO service_role;

ALTER TABLE public.rejected_advisor_applications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins can view rejected applications" ON public.rejected_advisor_applications;
CREATE POLICY "Admins can view rejected applications"
  ON public.rejected_advisor_applications FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can insert rejected applications" ON public.rejected_advisor_applications;
CREATE POLICY "Admins can insert rejected applications"
  ON public.rejected_advisor_applications FOR INSERT TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE OR REPLACE FUNCTION public.admin_reject_advisor(_advisor_id uuid, _reason text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _a public.advisors%ROWTYPE;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _a FROM public.advisors WHERE id = _advisor_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'advisor not found'; END IF;

  INSERT INTO public.rejected_advisor_applications (
    original_advisor_id, user_id, full_name, email, phone, sebi_reg_no, pan_no,
    aadhaar_no, strategy_type, bio, rejection_reason, original_created_at, rejected_by
  ) VALUES (
    _a.id, _a.user_id, _a.full_name, _a.email, _a.phone, _a.sebi_reg_no, _a.pan_no,
    _a.aadhaar_no, _a.strategy_type, _a.bio, COALESCE(_reason, 'No reason provided'),
    _a.created_at, auth.uid()
  );

  DELETE FROM public.advisors WHERE id = _advisor_id;
  UPDATE public.profiles SET role = 'trader' WHERE id = _a.user_id AND role = 'advisor';
END; $$;

-- Backfill: move existing rejected rows to archive
INSERT INTO public.rejected_advisor_applications (
  original_advisor_id, user_id, full_name, email, phone, sebi_reg_no, pan_no,
  aadhaar_no, strategy_type, bio, rejection_reason, original_created_at, rejected_at)
SELECT id, user_id, full_name, email, phone, sebi_reg_no, pan_no, aadhaar_no,
       strategy_type, bio, COALESCE(rejection_reason, 'Legacy rejection'),
       created_at, now()
FROM public.advisors WHERE status = 'rejected';

UPDATE public.profiles p SET role = 'trader'
WHERE role = 'advisor'
  AND EXISTS (SELECT 1 FROM public.advisors a WHERE a.user_id = p.id AND a.status = 'rejected');

DELETE FROM public.advisors WHERE status = 'rejected';

CREATE OR REPLACE FUNCTION public.admin_list_rejected_applications()
RETURNS SETOF public.rejected_advisor_applications
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.rejected_advisor_applications ORDER BY rejected_at DESC;
END; $$;

-- =========================================================
-- 3. Referral: one permanent link per advisor
-- =========================================================
ALTER TABLE public.referral_links DROP CONSTRAINT IF EXISTS referral_links_advisor_id_group_id_key;
ALTER TABLE public.referral_links ALTER COLUMN group_id DROP NOT NULL;

WITH ranked AS (
  SELECT id, advisor_id,
         ROW_NUMBER() OVER (PARTITION BY advisor_id ORDER BY created_at ASC) AS rn
  FROM public.referral_links)
DELETE FROM public.referral_links WHERE id IN (SELECT id FROM ranked WHERE rn > 1);

UPDATE public.referral_links SET group_id = NULL;

ALTER TABLE public.referral_links DROP CONSTRAINT IF EXISTS referral_links_group_id_fkey;
ALTER TABLE public.referral_links
  ADD CONSTRAINT referral_links_group_id_fkey
  FOREIGN KEY (group_id) REFERENCES public.groups(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS referral_links_advisor_unique ON public.referral_links(advisor_id);

CREATE OR REPLACE FUNCTION public.ensure_advisor_referral_link()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _code text; _prefix text;
BEGIN
  IF NEW.status = 'approved' AND (TG_OP = 'INSERT' OR OLD.status IS DISTINCT FROM 'approved') THEN
    IF NOT EXISTS (SELECT 1 FROM public.referral_links WHERE advisor_id = NEW.id) THEN
      _prefix := UPPER(REGEXP_REPLACE(COALESCE(NEW.full_name, 'ADV'), '[^A-Za-z]', '', 'g'));
      _prefix := COALESCE(NULLIF(SUBSTRING(_prefix FROM 1 FOR 3), ''), 'ADV');
      _code := 'RA-' || _prefix || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-','') FROM 1 FOR 6));
      INSERT INTO public.referral_links (advisor_id, group_id, referral_code, is_active)
      VALUES (NEW.id, NULL, _code, true)
      ON CONFLICT (advisor_id) DO NOTHING;
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_ensure_advisor_referral_link ON public.advisors;
CREATE TRIGGER trg_ensure_advisor_referral_link
  AFTER INSERT OR UPDATE OF status ON public.advisors
  FOR EACH ROW EXECUTE FUNCTION public.ensure_advisor_referral_link();

INSERT INTO public.referral_links (advisor_id, group_id, referral_code, is_active)
SELECT a.id, NULL,
       'RA-' || COALESCE(NULLIF(SUBSTRING(UPPER(REGEXP_REPLACE(a.full_name,'[^A-Za-z]','','g')) FROM 1 FOR 3), ''), 'ADV')
        || '-' || UPPER(SUBSTRING(REPLACE(gen_random_uuid()::text,'-','') FROM 1 FOR 6)),
       true
FROM public.advisors a
WHERE a.status = 'approved'
  AND NOT EXISTS (SELECT 1 FROM public.referral_links r WHERE r.advisor_id = a.id)
ON CONFLICT (advisor_id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.link_subscription_to_referral()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.from_referral, false) = true AND NEW.referral_code IS NOT NULL THEN
    IF NEW.platform_fee_percent IS NULL OR NEW.platform_fee_percent = 30 THEN
      NEW.platform_fee_percent := 15;
    END IF;
  ELSIF NEW.platform_fee_percent IS NULL THEN
    NEW.platform_fee_percent := 30;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_link_subscription_to_referral ON public.subscriptions;
CREATE TRIGGER trg_link_subscription_to_referral
  BEFORE INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.link_subscription_to_referral();

CREATE OR REPLACE FUNCTION public.after_subscription_referral_sideeffects()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$
BEGIN
  IF COALESCE(NEW.from_referral, false) = true AND NEW.referral_code IS NOT NULL THEN
    UPDATE public.referral_links
      SET total_conversions = COALESCE(total_conversions,0) + 1,
          total_revenue_generated = COALESCE(total_revenue_generated,0) + COALESCE(NEW.amount_paid,0)
      WHERE referral_code = NEW.referral_code;
    UPDATE public.referral_signups
      SET converted_to_paid = true, subscription_id = NEW.id, platform_fee_percent = 15
      WHERE user_id = NEW.user_id AND referral_code = NEW.referral_code
        AND (converted_to_paid IS NULL OR converted_to_paid = false);
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_after_subscription_referral ON public.subscriptions;
CREATE TRIGGER trg_after_subscription_referral
  AFTER INSERT ON public.subscriptions
  FOR EACH ROW EXECUTE FUNCTION public.after_subscription_referral_sideeffects();

UPDATE public.subscriptions
SET platform_fee_percent = CASE WHEN COALESCE(from_referral,false) THEN 15 ELSE 30 END
WHERE platform_fee_percent IS NULL;

UPDATE public.advisor_daily_earnings e
SET standard_gross = e.gross_revenue, referral_gross = 0, referral_subs_count = 0
WHERE standard_gross = 0 AND referral_gross = 0;

-- =========================================================
-- 4. Referral dashboard RPC
-- =========================================================
CREATE OR REPLACE FUNCTION public.get_advisor_referral_dashboard(_advisor_id uuid)
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
DECLARE _link json; _signups json; _active_subs json; _stats json;
BEGIN
  IF NOT (public.is_admin(auth.uid())
          OR EXISTS (SELECT 1 FROM public.advisors WHERE id = _advisor_id AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT row_to_json(r) INTO _link
  FROM (SELECT id, referral_code, is_active, total_clicks, total_signups,
               total_conversions, total_revenue_generated, created_at
        FROM public.referral_links WHERE advisor_id = _advisor_id LIMIT 1) r;

  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO _signups
  FROM (
    SELECT rs.id, rs.user_id, rs.signed_up_at, rs.converted_to_paid,
           rs.subscription_id, rs.platform_fee_percent,
           COALESCE(p.full_name, 'User') AS user_label
    FROM public.referral_signups rs
    LEFT JOIN public.profiles p ON p.id = rs.user_id
    WHERE rs.advisor_id = _advisor_id
    ORDER BY rs.signed_up_at DESC LIMIT 200) x;

  SELECT COALESCE(json_agg(row_to_json(x)), '[]'::json) INTO _active_subs
  FROM (
    SELECT s.id, s.user_id, s.group_id, g.name AS group_name,
           s.amount_paid, s.start_date, s.end_date, s.status, s.platform_fee_percent
    FROM public.subscriptions s
    LEFT JOIN public.groups g ON g.id = s.group_id
    WHERE s.advisor_id = _advisor_id AND s.from_referral = true
    ORDER BY s.created_at DESC LIMIT 200) x;

  SELECT json_build_object(
    'referral_revenue', COALESCE(SUM(referral_gross),0),
    'standard_revenue', COALESCE(SUM(standard_gross),0),
    'referral_subs_count', COALESCE(SUM(referral_subs_count),0),
    'fee_saved', ROUND(COALESCE(SUM(referral_gross * 0.82 * 0.15),0), 2)
  ) INTO _stats FROM public.advisor_daily_earnings WHERE advisor_id = _advisor_id;

  RETURN json_build_object('link', _link, 'signups', _signups, 'active_subs', _active_subs, 'stats', _stats);
END; $$;
