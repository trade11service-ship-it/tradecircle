
-- Fix 1: Advisors - restrict to authenticated only for approved branch
DROP POLICY IF EXISTS "View approved or own advisors" ON public.advisors;

CREATE POLICY "View approved or own advisors" ON public.advisors
FOR SELECT TO authenticated
USING (
  (status = 'approved')
  OR (auth.uid() = user_id)
  OR is_admin(auth.uid())
);

-- Fix 2: Profiles - restrict to own profile + admin reads all
DROP POLICY IF EXISTS "Authenticated read all profiles" ON public.profiles;

-- Users read own profile
CREATE POLICY "Users read own profile" ON public.profiles
FOR SELECT TO authenticated
USING (auth.uid() = id);

-- Admin reads all profiles
CREATE POLICY "Admin read all profiles" ON public.profiles
FOR SELECT TO authenticated
USING (is_admin(auth.uid()));
