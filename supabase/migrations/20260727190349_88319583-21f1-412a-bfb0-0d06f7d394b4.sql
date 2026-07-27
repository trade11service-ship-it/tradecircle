-- ============ GROUPS: advisor-owned payment configuration ============
ALTER TABLE public.groups
  ADD COLUMN IF NOT EXISTS payment_mode text NOT NULL DEFAULT 'payment_link',
  ADD COLUMN IF NOT EXISTS advisor_payment_url text,
  ADD COLUMN IF NOT EXISTS advisor_merchant_key_id text,
  ADD COLUMN IF NOT EXISTS advisor_merchant_key_secret text,
  ADD COLUMN IF NOT EXISTS duration_days integer NOT NULL DEFAULT 30;

ALTER TABLE public.groups
  ADD CONSTRAINT groups_payment_mode_check
  CHECK (payment_mode IN ('payment_link','merchant_keys'));

-- Hide the merchant secret from every non-service role (column-level grants)
REVOKE SELECT ON public.groups FROM anon, authenticated;
GRANT SELECT (
  id, advisor_id, name, description, dp_url, monthly_price,
  razorpay_payment_link, is_active, created_at, strategy_category,
  payment_mode, advisor_payment_url, advisor_merchant_key_id, duration_days
) ON public.groups TO anon, authenticated;
GRANT ALL ON public.groups TO service_role;

-- ============ CLIENT ONBOARDING ============
CREATE TABLE public.client_onboarding (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  advisor_id uuid,
  kyc_verified boolean NOT NULL DEFAULT false,
  kra_status text,
  kyc_reference_id text,
  pan_masked text,
  encrypted_pan text,
  consent_given boolean NOT NULL DEFAULT false,
  consent_ip_address text,
  consent_user_agent text,
  consent_timestamp timestamptz,
  mitc_version text,
  pdf_vault_url text,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_reference_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT client_onboarding_payment_status_check
    CHECK (payment_status IN ('pending','captured','failed'))
);

CREATE INDEX idx_client_onboarding_user ON public.client_onboarding(user_id);
CREATE INDEX idx_client_onboarding_group ON public.client_onboarding(group_id);
CREATE INDEX idx_client_onboarding_advisor ON public.client_onboarding(advisor_id);

-- Column-level grants: encrypted_pan is service-role only
GRANT SELECT (
  id, user_id, group_id, advisor_id, kyc_verified, kra_status, kyc_reference_id,
  pan_masked, consent_given, consent_ip_address, consent_user_agent,
  consent_timestamp, mitc_version, pdf_vault_url, payment_status,
  payment_reference_id, created_at, updated_at
) ON public.client_onboarding TO authenticated;
GRANT INSERT (user_id, group_id, advisor_id) ON public.client_onboarding TO authenticated;
GRANT ALL ON public.client_onboarding TO service_role;

ALTER TABLE public.client_onboarding ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clients view own onboarding"
  ON public.client_onboarding FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Advisors view onboarding for their groups"
  ON public.client_onboarding FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.id = client_onboarding.advisor_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all onboarding"
  ON public.client_onboarding FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Clients start own onboarding"
  ON public.client_onboarding FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE TRIGGER trg_client_onboarding_updated_at
  BEFORE UPDATE ON public.client_onboarding
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_advisor_apps();

-- ============ COMPLIANCE LOGS (append-only) ============
CREATE TABLE public.compliance_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  onboarding_id uuid REFERENCES public.client_onboarding(id) ON DELETE SET NULL,
  ra_id uuid,
  user_id uuid,
  client_email text,
  event_type text NOT NULL,
  metadata_json jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT compliance_logs_event_type_check CHECK (
    event_type IN ('KYC_VERIFIED','MITC_ACCEPTED','PAYMENT_CAPTURED','PAYMENT_FAILED','PDF_HARDENED')
  )
);

CREATE INDEX idx_compliance_logs_onboarding ON public.compliance_logs(onboarding_id);
CREATE INDEX idx_compliance_logs_ra ON public.compliance_logs(ra_id);

GRANT SELECT, INSERT ON public.compliance_logs TO authenticated;
GRANT ALL ON public.compliance_logs TO service_role;

ALTER TABLE public.compliance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed in can append compliance logs"
  ON public.compliance_logs FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Clients view own compliance logs"
  ON public.compliance_logs FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Advisors view their compliance logs"
  ON public.compliance_logs FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.advisors a
    WHERE a.id = compliance_logs.ra_id AND a.user_id = auth.uid()
  ));

CREATE POLICY "Admins view all compliance logs"
  ON public.compliance_logs FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- ============ SUBSCRIPTIONS link ============
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS onboarding_id uuid REFERENCES public.client_onboarding(id) ON DELETE SET NULL;