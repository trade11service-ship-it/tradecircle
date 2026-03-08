
-- Fix 1: Prevent privilege escalation via INSERT - restrict role to 'trader' on insert
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
CREATE POLICY "Users insert own profile" ON public.profiles
FOR INSERT TO authenticated
WITH CHECK (auth.uid() = id AND (role IS NULL OR role = 'trader'));

-- Fix 2: Referral links - drop open policy, create restricted one
DROP POLICY IF EXISTS "Anyone read active referral code" ON public.referral_links;

-- Anon users need to validate referral codes on landing page
-- Use a security definer function to safely expose only needed fields
CREATE OR REPLACE FUNCTION public.get_referral_link_by_code(_code text)
RETURNS TABLE(advisor_id uuid, group_id uuid, referral_code text, is_active boolean)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$
  SELECT advisor_id, group_id, referral_code, is_active
  FROM public.referral_links
  WHERE referral_code = _code AND is_active = true
  LIMIT 1;
$$;

-- Authenticated users can read active referral links (needed for referral landing)
CREATE POLICY "Authenticated read active referral links" ON public.referral_links
FOR SELECT TO authenticated
USING (is_active = true);
