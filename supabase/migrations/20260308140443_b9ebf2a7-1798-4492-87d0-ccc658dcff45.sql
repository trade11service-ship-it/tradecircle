
CREATE TABLE public.deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  request_type text NOT NULL,
  reason text,
  group_id uuid,
  group_name text,
  advisor_name text,
  email text,
  status text NOT NULL DEFAULT 'pending',
  admin_notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  reviewed_at timestamp with time zone,
  reviewed_by uuid
);

ALTER TABLE public.deletion_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own deletion request"
  ON public.deletion_requests FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users read own deletion requests"
  ON public.deletion_requests FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admin read all deletion requests"
  ON public.deletion_requests FOR SELECT
  TO authenticated
  USING (is_admin(auth.uid()));

CREATE POLICY "Admin update deletion requests"
  ON public.deletion_requests FOR UPDATE
  TO authenticated
  USING (is_admin(auth.uid()));
