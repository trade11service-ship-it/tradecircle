-- 1. Hide advisor payment gateway credentials from all client roles
REVOKE SELECT ON public.groups FROM anon, authenticated;

GRANT SELECT (
  id, advisor_id, name, description, dp_url, monthly_price,
  razorpay_payment_link, is_active, created_at, strategy_category,
  payment_mode, advisor_payment_url, duration_days
) ON public.groups TO anon, authenticated;

GRANT INSERT, UPDATE, DELETE ON public.groups TO authenticated;
GRANT ALL ON public.groups TO service_role;

-- 2. Compliance logs: prevent forged entries
DROP POLICY IF EXISTS "Anyone signed in can append compliance logs" ON public.compliance_logs;

CREATE POLICY "Users append own compliance logs"
ON public.compliance_logs
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid()
  AND (
    ra_id IS NULL
    OR EXISTS (SELECT 1 FROM public.advisors a WHERE a.id = ra_id AND a.user_id = auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.client_onboarding co
      WHERE co.id = onboarding_id AND co.user_id = auth.uid() AND co.advisor_id = ra_id
    )
  )
);