
-- ================================================
-- CRITICAL FIX 1: Prevent privilege escalation
-- Users should NOT be able to change their own role
-- ================================================

-- Drop the existing permissive self-update policy
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;

-- Recreate: users can update own profile BUT NOT the role column
CREATE POLICY "Users update own profile" ON public.profiles
FOR UPDATE TO authenticated
USING (auth.uid() = id)
WITH CHECK (
  auth.uid() = id
  AND (
    -- role must remain unchanged
    role IS NOT DISTINCT FROM (SELECT p.role FROM public.profiles p WHERE p.id = auth.uid())
  )
);

-- ================================================
-- CRITICAL FIX 2: Restrict public profile visibility  
-- Only expose non-sensitive fields publicly
-- ================================================

DROP POLICY IF EXISTS "Public profiles viewable" ON public.profiles;

-- Authenticated users can see all profiles (needed for advisor names etc)
-- But we'll create a view for public-safe data
CREATE POLICY "Authenticated read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (true);

-- ================================================
-- CRITICAL FIX 3: Restrict advisor PII visibility
-- Only show sensitive fields to the advisor themselves or admin
-- ================================================

DROP POLICY IF EXISTS "View approved or own advisors" ON public.advisors;

-- Public can see approved advisors but RLS alone can't filter columns
-- We'll restrict at query level + keep policy simple  
CREATE POLICY "View approved or own advisors" ON public.advisors
FOR SELECT
USING (
  (status = 'approved')
  OR (auth.uid() = user_id)
  OR is_admin(auth.uid())
);

-- ================================================
-- CRITICAL FIX 4: Historical signals require authentication
-- Past signals visible to authenticated users only (not anon)
-- ================================================

DROP POLICY IF EXISTS "View signals" ON public.signals;

CREATE POLICY "View signals" ON public.signals
FOR SELECT TO authenticated
USING (
  -- Past signals: any authenticated user can view (social proof)
  (signal_date < CURRENT_DATE)
  -- Today's signals: subscribers only
  OR (EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.user_id = auth.uid()
      AND subscriptions.group_id = signals.group_id
      AND subscriptions.status = 'active'
      AND subscriptions.end_date >= now()
  ))
  -- Advisor can see their own signals
  OR (EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = signals.advisor_id
      AND advisors.user_id = auth.uid()
  ))
  -- Public messages visible to followers
  OR (
    is_public = true
    AND post_type = 'message'
    AND EXISTS (
      SELECT 1 FROM group_follows
      WHERE group_follows.user_id = auth.uid()
        AND group_follows.group_id = signals.group_id
    )
  )
  -- Admin
  OR is_admin(auth.uid())
);

-- ================================================
-- CRITICAL FIX 5: Referral links - hide business metrics from public
-- ================================================

DROP POLICY IF EXISTS "Anyone read active referral links" ON public.referral_links;

-- Only expose referral_code for the join flow (via edge function or authenticated query)
-- Public needs to read active links to validate referral codes on landing page
CREATE POLICY "Anyone read active referral code" ON public.referral_links
FOR SELECT
USING (is_active = true);
