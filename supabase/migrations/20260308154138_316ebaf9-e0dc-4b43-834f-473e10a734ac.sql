
-- Create referral_links table
CREATE TABLE public.referral_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid REFERENCES public.advisors(id) NOT NULL,
  group_id uuid REFERENCES public.groups(id) NOT NULL,
  referral_code text UNIQUE NOT NULL,
  total_clicks integer DEFAULT 0,
  total_signups integer DEFAULT 0,
  total_conversions integer DEFAULT 0,
  total_revenue_generated integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  UNIQUE(advisor_id, group_id)
);

-- Create referral_visits table
CREATE TABLE public.referral_visits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL REFERENCES public.referral_links(referral_code),
  advisor_id uuid REFERENCES public.advisors(id) NOT NULL,
  group_id uuid REFERENCES public.groups(id) NOT NULL,
  visitor_ip text,
  user_agent text,
  visited_at timestamp with time zone DEFAULT now(),
  converted_to_signup boolean DEFAULT false,
  converted_to_paid boolean DEFAULT false,
  user_id uuid REFERENCES public.profiles(id)
);

-- Create referral_signups table
CREATE TABLE public.referral_signups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_code text NOT NULL,
  advisor_id uuid REFERENCES public.advisors(id) NOT NULL,
  group_id uuid REFERENCES public.groups(id) NOT NULL,
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  signed_up_at timestamp with time zone DEFAULT now(),
  converted_to_paid boolean DEFAULT false,
  subscription_id uuid,
  platform_fee_percent integer DEFAULT 15,
  is_referral_active boolean DEFAULT true,
  UNIQUE(user_id, group_id)
);

-- Add referral columns to subscriptions
ALTER TABLE public.subscriptions
ADD COLUMN from_referral boolean DEFAULT false,
ADD COLUMN referral_code text,
ADD COLUMN referral_advisor_id uuid,
ADD COLUMN platform_fee_percent integer DEFAULT 30;

-- RLS for referral_links
ALTER TABLE public.referral_links ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Advisors read own referral links"
ON public.referral_links FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = referral_links.advisor_id AND advisors.user_id = auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Advisors insert own referral links"
ON public.referral_links FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = referral_links.advisor_id AND advisors.user_id = auth.uid())
);

CREATE POLICY "Anyone read active referral links"
ON public.referral_links FOR SELECT
TO anon, authenticated
USING (is_active = true);

-- RLS for referral_visits
ALTER TABLE public.referral_visits ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone insert referral visits"
ON public.referral_visits FOR INSERT
TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Advisors read own referral visits"
ON public.referral_visits FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = referral_visits.advisor_id AND advisors.user_id = auth.uid())
  OR is_admin(auth.uid())
);

-- RLS for referral_signups
ALTER TABLE public.referral_signups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own referral signups"
ON public.referral_signups FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Advisors read own referral signups"
ON public.referral_signups FOR SELECT
TO authenticated
USING (
  EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = referral_signups.advisor_id AND advisors.user_id = auth.uid())
  OR is_admin(auth.uid())
);

CREATE POLICY "Authenticated insert referral signups"
ON public.referral_signups FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

-- Security definer function to increment referral stats (bypasses RLS)
CREATE OR REPLACE FUNCTION public.increment_referral_clicks(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_links SET total_clicks = total_clicks + 1 WHERE referral_code = _code AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_referral_signups(_code text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_links SET total_signups = total_signups + 1 WHERE referral_code = _code AND is_active = true;
END;
$$;

CREATE OR REPLACE FUNCTION public.increment_referral_conversions(_code text, _revenue integer)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.referral_links
  SET total_conversions = total_conversions + 1,
      total_revenue_generated = total_revenue_generated + _revenue
  WHERE referral_code = _code AND is_active = true;
END;
$$;

-- Admin can update referral_links (deactivate)
CREATE POLICY "Admin update referral links"
ON public.referral_links FOR UPDATE
TO authenticated
USING (is_admin(auth.uid()));
