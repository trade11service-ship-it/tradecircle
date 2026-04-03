-- Drop existing restrictive policy
DROP POLICY IF EXISTS "View signals" ON public.signals;

-- Create new policy that allows public signals to be seen by everyone
CREATE POLICY "View signals" ON public.signals
FOR SELECT
TO public
USING (
  -- Public signals visible to everyone
  (is_public = true)
  -- Signals from previous days visible to everyone (F&O 24h rule handled in app)
  OR (signal_date < CURRENT_DATE)
  -- Active subscribers can see all signals in their group
  OR (EXISTS (
    SELECT 1 FROM subscriptions
    WHERE subscriptions.user_id = auth.uid()
      AND subscriptions.group_id = signals.group_id
      AND subscriptions.status = 'active'
      AND subscriptions.end_date >= now()
  ))
  -- Advisors can see their own signals
  OR (EXISTS (
    SELECT 1 FROM advisors
    WHERE advisors.id = signals.advisor_id
      AND advisors.user_id = auth.uid()
  ))
  -- Admins can see everything
  OR is_admin(auth.uid())
);