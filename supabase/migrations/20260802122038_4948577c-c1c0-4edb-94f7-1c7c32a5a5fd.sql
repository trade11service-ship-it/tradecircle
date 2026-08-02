-- 1) get_advisor_earnings: add owner/admin authorization (was readable by any signed-in user)
CREATE OR REPLACE FUNCTION public.get_advisor_earnings(_advisor_id uuid, _month date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE _result json;
BEGIN
  IF NOT (public.is_admin(auth.uid())
          OR EXISTS (SELECT 1 FROM public.advisors WHERE id = _advisor_id AND user_id = auth.uid())) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  SELECT json_build_object(
    'total_gross', COALESCE(SUM(gross_revenue), 0)::numeric,
    'total_gst', COALESCE(SUM(gst_amount), 0)::numeric,
    'total_platform_fee', COALESCE(SUM(platform_fee), 0)::numeric,
    'total_net', COALESCE(SUM(net_earning), 0)::numeric,
    'total_subs', COALESCE(SUM(subscription_count), 0)::integer,
    'month_gross', COALESCE(SUM(gross_revenue) FILTER (WHERE (_month IS NULL AND earning_date >= date_trunc('month', CURRENT_DATE)::date) OR (_month IS NOT NULL AND earning_date >= date_trunc('month', _month)::date AND earning_date < (date_trunc('month', _month) + interval '1 month')::date)), 0)::numeric,
    'month_net', COALESCE(SUM(net_earning) FILTER (WHERE (_month IS NULL AND earning_date >= date_trunc('month', CURRENT_DATE)::date) OR (_month IS NOT NULL AND earning_date >= date_trunc('month', _month)::date AND earning_date < (date_trunc('month', _month) + interval '1 month')::date)), 0)::numeric
  )
  INTO _result
  FROM public.advisor_daily_earnings
  WHERE advisor_id = _advisor_id;

  RETURN _result;
END;
$function$;

REVOKE ALL ON FUNCTION public.get_advisor_earnings(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_advisor_earnings(uuid, date) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_advisor_earnings(uuid, date) TO service_role;

-- 2) increment_referral_conversions: backend/webhook only
REVOKE ALL ON FUNCTION public.increment_referral_conversions(text, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.increment_referral_conversions(text, integer) TO service_role;
