
-- Create a security definer function to get public subscriber counts per advisor
CREATE OR REPLACE FUNCTION public.get_advisor_subscriber_count(_advisor_id uuid)
RETURNS integer
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(COUNT(DISTINCT user_id)::integer, 0)
  FROM public.subscriptions
  WHERE advisor_id = _advisor_id
    AND status = 'active'
$$;
