
-- 1. Create group_follows table
CREATE TABLE public.group_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  group_id uuid NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.group_follows ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own follows" ON public.group_follows FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own follows" ON public.group_follows FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users read own follows" ON public.group_follows FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Advisor see followers of their groups" ON public.group_follows FOR SELECT TO authenticated USING (
  EXISTS (SELECT 1 FROM public.groups g JOIN public.advisors a ON a.id = g.advisor_id WHERE g.id = group_follows.group_id AND a.user_id = auth.uid())
);

-- 2. Add is_public column to signals (default false = private/subscribers only)
ALTER TABLE public.signals ADD COLUMN is_public boolean NOT NULL DEFAULT false;

-- 3. Update signals RLS to allow followers to see public posts (messages only, not signals)
DROP POLICY IF EXISTS "View signals" ON public.signals;

CREATE POLICY "View signals" ON public.signals FOR SELECT USING (
  -- Past signals visible to all (existing behavior)
  (signal_date < CURRENT_DATE)
  OR
  -- Active subscribers see everything
  (EXISTS (SELECT 1 FROM public.subscriptions WHERE subscriptions.user_id = auth.uid() AND subscriptions.group_id = signals.group_id AND subscriptions.status = 'active' AND subscriptions.end_date >= now()))
  OR
  -- Advisor sees own signals
  (EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = signals.advisor_id AND advisors.user_id = auth.uid()))
  OR
  -- Followers can see public message posts (not signals)
  (is_public = true AND post_type = 'message' AND EXISTS (SELECT 1 FROM public.group_follows WHERE group_follows.user_id = auth.uid() AND group_follows.group_id = signals.group_id))
  OR
  -- Admin sees all
  (is_admin(auth.uid()))
);
