
-- 1. Financial compliance archive (immutable)
CREATE TABLE public.financial_compliance_archive (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  subscription_id uuid,
  full_name text,
  email text,
  phone text,
  pan_number text,
  amount_paid integer,
  razorpay_payment_id text,
  consent_timestamp timestamptz,
  consent_ip text,
  archived_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fca_user_id ON public.financial_compliance_archive(user_id);
CREATE INDEX idx_fca_payment_id ON public.financial_compliance_archive(razorpay_payment_id);

-- Grants: only service_role writes; admins read via RLS using authenticated role
GRANT ALL ON public.financial_compliance_archive TO service_role;
GRANT SELECT ON public.financial_compliance_archive TO authenticated;
-- Explicitly no anon access

ALTER TABLE public.financial_compliance_archive ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read archive"
  ON public.financial_compliance_archive FOR SELECT
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- No INSERT/UPDATE/DELETE policies for authenticated → only service_role can mutate.

-- 2. Foreign key realignment
ALTER TABLE public.subscriptions
  DROP CONSTRAINT IF EXISTS subscriptions_user_id_fkey;
ALTER TABLE public.subscriptions
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.subscriptions
  ADD CONSTRAINT subscriptions_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.user_legal_acceptances
  DROP CONSTRAINT IF EXISTS user_legal_acceptances_user_id_fkey;
ALTER TABLE public.user_legal_acceptances
  ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.user_legal_acceptances
  ADD CONSTRAINT user_legal_acceptances_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE SET NULL;

ALTER TABLE public.group_follows
  DROP CONSTRAINT IF EXISTS group_follows_user_id_fkey;
ALTER TABLE public.group_follows
  ADD CONSTRAINT group_follows_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.profiles(id) ON DELETE CASCADE;

-- 3. Admin RPC to anonymize a paid user's profile (Bucket B)
CREATE OR REPLACE FUNCTION public.admin_anonymize_profile(_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN
    RAISE EXCEPTION 'forbidden';
  END IF;

  UPDATE public.profiles
  SET full_name = 'Deleted User',
      email = 'deleted+' || _user_id::text || '@deleted.local',
      phone = NULL,
      avatar_url = NULL
  WHERE id = _user_id;
END;
$$;

REVOKE ALL ON FUNCTION public.admin_anonymize_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.admin_anonymize_profile(uuid) TO authenticated, service_role;
