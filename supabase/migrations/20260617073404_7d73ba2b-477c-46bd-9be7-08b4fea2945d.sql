-- 1. Add PAN + consent columns referenced by SubscriptionModal/PaymentSuccess flow
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text;

COMMENT ON COLUMN public.subscriptions.pan_number IS 'PAN collected at subscription time for SEBI audit (format ABCDE1234F)';
COMMENT ON COLUMN public.subscriptions.consent_timestamp IS 'Exact UTC timestamp of risk-disclosure consent at payment';

-- 2. Remove overly broad referral_links SELECT policy.
-- "Advisors read own referral links" + public.get_referral_link_by_code (SECURITY DEFINER) cover all valid reads.
DROP POLICY IF EXISTS "Authenticated read active referral links" ON public.referral_links;

-- 3. Lock KYC document reads down to the uploading user or admins.
DROP POLICY IF EXISTS "View KYC" ON storage.objects;

CREATE POLICY "KYC owner or admin read"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'kyc-documents'
  AND (
    public.is_admin(auth.uid())
    OR (auth.uid()::text = (storage.foldername(name))[1])
  )
);