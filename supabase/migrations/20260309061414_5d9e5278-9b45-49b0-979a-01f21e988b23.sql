
-- ============================================
-- FIX 1: Make profiles SELECT policies PERMISSIVE (they were RESTRICTIVE, breaking advisor joins)
-- ============================================
DROP POLICY IF EXISTS "Admin read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Admin update any profile" ON public.profiles;

-- Recreate as PERMISSIVE (default)
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated USING (auth.uid() = id);

CREATE POLICY "Admin read all profiles" ON public.profiles
FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- Advisors can see subscriber profiles (needed for subscriber tab)
CREATE POLICY "Advisors read subscriber profiles" ON public.profiles
FOR SELECT TO authenticated USING (
  EXISTS (
    SELECT 1 FROM public.subscriptions s
    JOIN public.advisors a ON a.id = s.advisor_id
    WHERE s.user_id = profiles.id AND a.user_id = auth.uid()
  )
);

CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated WITH CHECK (auth.uid() = id AND (role IS NULL OR role = 'trader'));

CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated USING (auth.uid() = id)
WITH CHECK (auth.uid() = id AND NOT (role IS DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())));

CREATE POLICY "Admin update any profile" ON public.profiles
FOR UPDATE TO authenticated USING (is_admin(auth.uid())) WITH CHECK (is_admin(auth.uid()));

-- ============================================
-- FIX 2: Create advisor_daily_earnings table
-- ============================================
CREATE TABLE IF NOT EXISTS public.advisor_daily_earnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid NOT NULL REFERENCES public.advisors(id) ON DELETE CASCADE,
  earning_date date NOT NULL DEFAULT CURRENT_DATE,
  gross_revenue numeric NOT NULL DEFAULT 0,
  gst_amount numeric NOT NULL DEFAULT 0,
  platform_fee numeric NOT NULL DEFAULT 0,
  net_earning numeric NOT NULL DEFAULT 0,
  subscription_count integer NOT NULL DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  UNIQUE(advisor_id, earning_date)
);

ALTER TABLE public.advisor_daily_earnings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors read own earnings" ON public.advisor_daily_earnings
FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = advisor_daily_earnings.advisor_id AND advisors.user_id = auth.uid())
);

CREATE POLICY "Admin read all earnings" ON public.advisor_daily_earnings
FOR SELECT TO authenticated USING (is_admin(auth.uid()));

-- No direct insert/update/delete for non-admins (trigger handles it)

-- ============================================
-- FIX 3: Trigger to auto-record earnings on subscription creation
-- ============================================
CREATE OR REPLACE FUNCTION public.record_subscription_earning()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _gross numeric;
  _gst numeric;
  _platform_fee_pct numeric;
  _platform_fee numeric;
  _net numeric;
BEGIN
  _gross := COALESCE(NEW.amount_paid, 0);
  _gst := _gross * 0.18;
  _platform_fee_pct := COALESCE(NEW.platform_fee_percent, 30);
  _platform_fee := (_gross - _gst) * (_platform_fee_pct / 100.0);
  _net := _gross - _gst - _platform_fee;

  INSERT INTO public.advisor_daily_earnings (advisor_id, earning_date, gross_revenue, gst_amount, platform_fee, net_earning, subscription_count)
  VALUES (NEW.advisor_id, COALESCE(NEW.start_date::date, CURRENT_DATE), _gross, _gst, _platform_fee, _net, 1)
  ON CONFLICT (advisor_id, earning_date)
  DO UPDATE SET
    gross_revenue = advisor_daily_earnings.gross_revenue + EXCLUDED.gross_revenue,
    gst_amount = advisor_daily_earnings.gst_amount + EXCLUDED.gst_amount,
    platform_fee = advisor_daily_earnings.platform_fee + EXCLUDED.platform_fee,
    net_earning = advisor_daily_earnings.net_earning + EXCLUDED.net_earning,
    subscription_count = advisor_daily_earnings.subscription_count + 1;

  RETURN NEW;
END;
$$;

CREATE TRIGGER on_subscription_created
AFTER INSERT ON public.subscriptions
FOR EACH ROW
EXECUTE FUNCTION public.record_subscription_earning();

-- ============================================
-- FIX 4: Backfill existing subscriptions into daily earnings
-- ============================================
INSERT INTO public.advisor_daily_earnings (advisor_id, earning_date, gross_revenue, gst_amount, platform_fee, net_earning, subscription_count)
SELECT
  s.advisor_id,
  COALESCE(s.start_date::date, s.created_at::date),
  SUM(COALESCE(s.amount_paid, 0)),
  SUM(COALESCE(s.amount_paid, 0) * 0.18),
  SUM((COALESCE(s.amount_paid, 0) - COALESCE(s.amount_paid, 0) * 0.18) * (COALESCE(s.platform_fee_percent, 30) / 100.0)),
  SUM(COALESCE(s.amount_paid, 0) - COALESCE(s.amount_paid, 0) * 0.18 - (COALESCE(s.amount_paid, 0) - COALESCE(s.amount_paid, 0) * 0.18) * (COALESCE(s.platform_fee_percent, 30) / 100.0)),
  COUNT(*)::integer
FROM public.subscriptions s
GROUP BY s.advisor_id, COALESCE(s.start_date::date, s.created_at::date)
ON CONFLICT (advisor_id, earning_date) DO NOTHING;

-- ============================================
-- FIX 5: Function to get advisor total/monthly earnings
-- ============================================
CREATE OR REPLACE FUNCTION public.get_advisor_earnings(_advisor_id uuid, _month date DEFAULT NULL)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_gross', COALESCE(SUM(gross_revenue), 0)::numeric,
    'total_gst', COALESCE(SUM(gst_amount), 0)::numeric,
    'total_platform_fee', COALESCE(SUM(platform_fee), 0)::numeric,
    'total_net', COALESCE(SUM(net_earning), 0)::numeric,
    'total_subs', COALESCE(SUM(subscription_count), 0)::integer,
    'month_gross', COALESCE(SUM(gross_revenue) FILTER (WHERE (_month IS NULL AND earning_date >= date_trunc('month', CURRENT_DATE)::date) OR (_month IS NOT NULL AND earning_date >= date_trunc('month', _month)::date AND earning_date < (date_trunc('month', _month) + interval '1 month')::date)), 0)::numeric,
    'month_net', COALESCE(SUM(net_earning) FILTER (WHERE (_month IS NULL AND earning_date >= date_trunc('month', CURRENT_DATE)::date) OR (_month IS NOT NULL AND earning_date >= date_trunc('month', _month)::date AND earning_date < (date_trunc('month', _month) + interval '1 month')::date)), 0)::numeric
  )
  FROM public.advisor_daily_earnings
  WHERE advisor_id = _advisor_id
$$;
