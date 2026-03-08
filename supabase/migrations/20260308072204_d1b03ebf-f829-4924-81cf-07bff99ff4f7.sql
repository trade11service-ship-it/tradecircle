
-- Allow admin to update any profile (for role changes)
CREATE POLICY "Admin update any profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (public.is_admin(auth.uid()))
WITH CHECK (public.is_admin(auth.uid()));

-- Allow admin to view all subscriptions
CREATE POLICY "Admin view all subscriptions"
ON public.subscriptions FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));
