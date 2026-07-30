DROP POLICY IF EXISTS "Anyone can read feed events" ON public.group_feed_events;

REVOKE SELECT ON public.group_feed_events FROM anon;
GRANT SELECT ON public.group_feed_events TO authenticated;

CREATE POLICY "Subscribers advisors and admins can read feed events"
  ON public.group_feed_events FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid())
    OR EXISTS (
      SELECT 1 FROM public.groups g
      JOIN public.advisors a ON a.id = g.advisor_id
      WHERE g.id = group_feed_events.group_id
        AND a.user_id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.subscriptions s
      WHERE s.group_id = group_feed_events.group_id
        AND s.user_id = auth.uid()
        AND s.status = 'active'
        AND (s.end_date IS NULL OR s.end_date > now())
    )
  );