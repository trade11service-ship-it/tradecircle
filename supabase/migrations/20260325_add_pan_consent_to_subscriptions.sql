-- Add PAN number, consent tracking, and IP address to subscriptions table
ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS pan_number text,
  ADD COLUMN IF NOT EXISTS consent_given boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS consent_timestamp timestamptz,
  ADD COLUMN IF NOT EXISTS consent_ip text;

-- Add comment explaining the fields
COMMENT ON COLUMN public.subscriptions.pan_number IS 'PAN number required for SEBI compliance (format: ABCDE1234F)';
COMMENT ON COLUMN public.subscriptions.consent_given IS 'Whether user consented to the research service terms';
COMMENT ON COLUMN public.subscriptions.consent_timestamp IS 'When consent was given (UTC)';
COMMENT ON COLUMN public.subscriptions.consent_ip IS 'IP address when consent was given';
