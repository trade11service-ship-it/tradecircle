CREATE TABLE public.group_payment_credentials (
  group_id uuid PRIMARY KEY REFERENCES public.groups(id) ON DELETE CASCADE,
  advisor_payment_url text,
  advisor_merchant_key_id text,
  advisor_merchant_key_secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.group_payment_credentials TO service_role;

ALTER TABLE public.group_payment_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service role only" ON public.group_payment_credentials
  FOR ALL TO service_role USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at_gpc()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

REVOKE EXECUTE ON FUNCTION public.set_updated_at_gpc() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER trg_gpc_updated_at BEFORE UPDATE ON public.group_payment_credentials
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_gpc();

INSERT INTO public.group_payment_credentials (group_id, advisor_payment_url, advisor_merchant_key_id, advisor_merchant_key_secret)
SELECT id, advisor_payment_url, advisor_merchant_key_id, advisor_merchant_key_secret
FROM public.groups
WHERE advisor_payment_url IS NOT NULL
   OR advisor_merchant_key_id IS NOT NULL
   OR advisor_merchant_key_secret IS NOT NULL;

ALTER TABLE public.groups
  DROP COLUMN advisor_payment_url,
  DROP COLUMN advisor_merchant_key_id,
  DROP COLUMN advisor_merchant_key_secret;

ALTER PUBLICATION supabase_realtime DROP TABLE public.groups;