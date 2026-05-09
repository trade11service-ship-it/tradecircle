
ALTER TABLE public.advisors
  ADD COLUMN IF NOT EXISTS risk_level text,
  ADD COLUMN IF NOT EXISTS preferred_trading_hours text;

CREATE OR REPLACE FUNCTION public.get_advisor_live_stats(_advisor_id uuid)
RETURNS json
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _total int := 0;
  _wins int := 0;
  _losses int := 0;
  _pending int := 0;
  _members int := 0;
  _followers int := 0;
  _first_group_at timestamptz;
  _weeks numeric := 1;
  _per_week numeric := 0;
  _current_streak int := 0;
  _current_streak_type text := NULL;
  _max_loss_streak int := 0;
  _active_hour int := NULL;
BEGIN
  -- Counts
  SELECT
    COUNT(*) FILTER (WHERE post_type = 'signal'),
    COUNT(*) FILTER (WHERE post_type = 'signal' AND result IN ('WIN','TGT_HIT','TARGET_HIT','TGT1_HIT','TGT2_HIT')),
    COUNT(*) FILTER (WHERE post_type = 'signal' AND result IN ('LOSS','SL_HIT'))
  INTO _total, _wins, _losses
  FROM public.signals
  WHERE advisor_id = _advisor_id;

  _pending := GREATEST(_total - _wins - _losses, 0);

  -- Active members (distinct users with active subs)
  SELECT COUNT(DISTINCT s.user_id) INTO _members
  FROM public.subscriptions s
  WHERE s.advisor_id = _advisor_id
    AND s.status = 'active'
    AND (s.end_date IS NULL OR s.end_date > now());

  -- Followers across advisor's groups
  SELECT COUNT(*) INTO _followers
  FROM public.group_follows gf
  JOIN public.groups g ON g.id = gf.group_id
  WHERE g.advisor_id = _advisor_id;

  -- Signals per week since first group creation
  SELECT MIN(created_at) INTO _first_group_at FROM public.groups WHERE advisor_id = _advisor_id;
  IF _first_group_at IS NOT NULL THEN
    _weeks := GREATEST(1, EXTRACT(EPOCH FROM (now() - _first_group_at)) / (60*60*24*7));
    _per_week := ROUND((_total::numeric / _weeks)::numeric, 2);
  END IF;

  -- Streaks (latest first)
  WITH ordered AS (
    SELECT result, created_at,
      CASE
        WHEN result IN ('WIN','TGT_HIT','TARGET_HIT','TGT1_HIT','TGT2_HIT') THEN 'WIN'
        WHEN result IN ('LOSS','SL_HIT') THEN 'LOSS'
        ELSE NULL
      END AS norm
    FROM public.signals
    WHERE advisor_id = _advisor_id AND post_type = 'signal'
    ORDER BY created_at DESC
  ),
  resolved AS (SELECT * FROM ordered WHERE norm IS NOT NULL)
  SELECT
    COALESCE((SELECT norm FROM resolved LIMIT 1), NULL),
    COALESCE((
      SELECT COUNT(*)::int
      FROM resolved
      WHERE norm = (SELECT norm FROM resolved LIMIT 1)
        AND created_at >= ALL(
          SELECT created_at FROM resolved WHERE norm <> (SELECT norm FROM resolved LIMIT 1)
        )
    ), 0)
  INTO _current_streak_type, _current_streak;

  -- Max loss streak (oldest first)
  WITH ordered AS (
    SELECT
      CASE
        WHEN result IN ('LOSS','SL_HIT') THEN 1 ELSE 0
      END AS is_loss,
      created_at
    FROM public.signals
    WHERE advisor_id = _advisor_id AND post_type = 'signal'
      AND result IN ('WIN','LOSS','TGT_HIT','TARGET_HIT','TGT1_HIT','TGT2_HIT','SL_HIT')
    ORDER BY created_at ASC
  ),
  runs AS (
    SELECT is_loss,
      SUM(CASE WHEN is_loss = 1 THEN 1 ELSE 0 END)
        OVER (ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        - SUM(CASE WHEN is_loss = 1 THEN 1 ELSE 0 END)
            OVER (PARTITION BY (CASE WHEN is_loss = 1 THEN 1 ELSE 0 END) ORDER BY created_at ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW)
        AS dummy
    FROM ordered
  )
  SELECT COALESCE(MAX(cnt), 0) INTO _max_loss_streak
  FROM (
    SELECT COUNT(*) AS cnt
    FROM (
      SELECT is_loss, created_at,
        ROW_NUMBER() OVER (ORDER BY created_at) -
        ROW_NUMBER() OVER (PARTITION BY is_loss ORDER BY created_at) AS grp
      FROM ordered
    ) x
    WHERE is_loss = 1
    GROUP BY grp
  ) y;

  -- Active hour bucket
  SELECT EXTRACT(HOUR FROM created_at)::int INTO _active_hour
  FROM public.signals
  WHERE advisor_id = _advisor_id AND post_type = 'signal' AND created_at IS NOT NULL
  GROUP BY EXTRACT(HOUR FROM created_at)
  ORDER BY COUNT(*) DESC
  LIMIT 1;

  RETURN json_build_object(
    'total_signals', _total,
    'win_count', _wins,
    'loss_count', _losses,
    'pending_count', _pending,
    'win_rate', CASE WHEN (_wins + _losses) > 0 THEN ROUND((_wins::numeric / (_wins + _losses)) * 100)::int ELSE NULL END,
    'active_members', _members,
    'followers', _followers,
    'signals_per_week', _per_week,
    'current_streak_type', _current_streak_type,
    'current_streak', _current_streak,
    'max_loss_streak', _max_loss_streak,
    'active_hour', _active_hour
  );
END;
$$;
