
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

ALTER TABLE public.subscriptions
  ADD COLUMN IF NOT EXISTS consent_text_version text,
  ADD COLUMN IF NOT EXISTS consent_user_agent text;

-- Fix advisor_id mismatches
UPDATE public.subscriptions s
SET advisor_id = g.advisor_id
FROM public.groups g
WHERE s.group_id = g.id
  AND s.advisor_id IS DISTINCT FROM g.advisor_id;

-- Collapse duplicate actives per (user, group) → cancelled
WITH ranked AS (
  SELECT id,
         row_number() OVER (
           PARTITION BY user_id, group_id
           ORDER BY end_date DESC NULLS LAST, created_at DESC
         ) AS rn
  FROM public.subscriptions
  WHERE status = 'active'
)
UPDATE public.subscriptions s
SET status = 'cancelled'
FROM ranked r
WHERE s.id = r.id AND r.rn > 1;

-- Flip already-expired
UPDATE public.subscriptions
SET status = 'expired'
WHERE status = 'active' AND end_date IS NOT NULL AND end_date < now();

-- Trigger enforcing advisor↔group match
CREATE OR REPLACE FUNCTION public.enforce_subscription_group_advisor_match()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _grp_advisor uuid;
BEGIN
  SELECT advisor_id INTO _grp_advisor FROM public.groups WHERE id = NEW.group_id;
  IF _grp_advisor IS NULL THEN
    RAISE EXCEPTION 'Group % does not exist', NEW.group_id;
  END IF;
  IF NEW.advisor_id IS NULL THEN
    NEW.advisor_id := _grp_advisor;
  ELSIF NEW.advisor_id <> _grp_advisor THEN
    RAISE EXCEPTION 'advisor_id % does not match group owner %', NEW.advisor_id, _grp_advisor;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_enforce_sub_group_advisor ON public.subscriptions;
CREATE TRIGGER trg_enforce_sub_group_advisor
BEFORE INSERT OR UPDATE OF group_id, advisor_id ON public.subscriptions
FOR EACH ROW EXECUTE FUNCTION public.enforce_subscription_group_advisor_match();

-- One active sub per (user, group)
DROP INDEX IF EXISTS public.subscriptions_active_user_group_uidx;
CREATE UNIQUE INDEX subscriptions_active_user_group_uidx
  ON public.subscriptions (user_id, group_id)
  WHERE status = 'active';

-- Nightly expiry sweep
DO $$ BEGIN
  PERFORM cron.unschedule('expire-subscriptions-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'expire-subscriptions-daily',
  '15 0 * * *',
  $$UPDATE public.subscriptions
     SET status = 'expired'
     WHERE status = 'active'
       AND end_date IS NOT NULL
       AND end_date < now();$$
);
