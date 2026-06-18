
-- 1) Feed preview RPC: returns posts for a group regardless of subscription so UI can render blurred lock previews.
CREATE OR REPLACE FUNCTION public.get_group_feed_posts(_group_id uuid, _limit int DEFAULT 100)
RETURNS TABLE (
  id uuid,
  group_id uuid,
  advisor_id uuid,
  post_type text,
  instrument text,
  signal_type text,
  entry_price numeric,
  target_price numeric,
  stop_loss numeric,
  timeframe text,
  notes text,
  result text,
  message_text text,
  image_url text,
  signal_date date,
  created_at timestamptz,
  is_public boolean
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT s.id, s.group_id, s.advisor_id, s.post_type, s.instrument, s.signal_type,
         s.entry_price, s.target_price, s.stop_loss, s.timeframe, s.notes, s.result,
         s.message_text, s.image_url, s.signal_date, s.created_at, s.is_public
  FROM public.signals s
  JOIN public.groups g ON g.id = s.group_id
  WHERE s.group_id = _group_id
    AND g.is_active = true
  ORDER BY s.created_at ASC
  LIMIT GREATEST(_limit, 1);
$$;

GRANT EXECUTE ON FUNCTION public.get_group_feed_posts(uuid, int) TO anon, authenticated;

-- 2) Lightweight event table for realtime fan-out (no sensitive content)
CREATE TABLE IF NOT EXISTS public.group_feed_events (
  id bigserial PRIMARY KEY,
  group_id uuid NOT NULL,
  signal_id uuid NOT NULL,
  event_type text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.group_feed_events TO anon, authenticated;
GRANT ALL ON public.group_feed_events TO service_role;

ALTER TABLE public.group_feed_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read feed events"
  ON public.group_feed_events FOR SELECT
  USING (true);

CREATE INDEX IF NOT EXISTS idx_group_feed_events_group ON public.group_feed_events(group_id, created_at DESC);

ALTER PUBLICATION supabase_realtime ADD TABLE public.group_feed_events;

-- 3) Triggers on signals to emit events
CREATE OR REPLACE FUNCTION public.emit_group_feed_event()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.group_feed_events(group_id, signal_id, event_type)
    VALUES (NEW.group_id, NEW.id, 'INSERT');
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO public.group_feed_events(group_id, signal_id, event_type)
    VALUES (NEW.group_id, NEW.id, 'UPDATE');
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO public.group_feed_events(group_id, signal_id, event_type)
    VALUES (OLD.group_id, OLD.id, 'DELETE');
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_signals_feed_event_ins ON public.signals;
DROP TRIGGER IF EXISTS trg_signals_feed_event_upd ON public.signals;
DROP TRIGGER IF EXISTS trg_signals_feed_event_del ON public.signals;

CREATE TRIGGER trg_signals_feed_event_ins
  AFTER INSERT ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.emit_group_feed_event();

CREATE TRIGGER trg_signals_feed_event_upd
  AFTER UPDATE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.emit_group_feed_event();

CREATE TRIGGER trg_signals_feed_event_del
  AFTER DELETE ON public.signals
  FOR EACH ROW EXECUTE FUNCTION public.emit_group_feed_event();

-- 4) Security: lock down advisor PII columns (column-level REVOKE)
REVOKE SELECT (pan_no, aadhaar_no, phone, email, address, pan_photo_url, aadhaar_photo_url)
  ON public.advisors FROM anon, authenticated;

-- 5) Security: restrict KYC bucket uploads to uploader's own folder
DROP POLICY IF EXISTS "Upload KYC" ON storage.objects;
CREATE POLICY "Upload KYC own folder"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'kyc-documents'
    AND (storage.foldername(name))[1] = (auth.uid())::text
  );
