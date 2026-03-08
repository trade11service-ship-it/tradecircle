
CREATE OR REPLACE FUNCTION public.get_advisor_signal_stats(_advisor_id uuid)
RETURNS json
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT json_build_object(
    'total_signals', COALESCE(COUNT(*)::integer, 0),
    'win_count', COALESCE(COUNT(*) FILTER (WHERE result = 'WIN')::integer, 0),
    'loss_count', COALESCE(COUNT(*) FILTER (WHERE result = 'LOSS')::integer, 0),
    'resolved_count', COALESCE(COUNT(*) FILTER (WHERE result IN ('WIN', 'LOSS'))::integer, 0)
  )
  FROM public.signals
  WHERE advisor_id = _advisor_id
    AND post_type = 'signal'
$$;
