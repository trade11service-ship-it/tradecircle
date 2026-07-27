-- Enums
CREATE TYPE public.course_review_status AS ENUM ('pending_review','approved','rejected');
CREATE TYPE public.creator_kyc_status AS ENUM ('unverified','pending','approved','rejected');
CREATE TYPE public.payout_ledger_status AS ENUM ('accrued','paid');

-- 1. Creator profiles (isolated from advisor SEBI vault)
CREATE TABLE public.creator_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  full_legal_name text NOT NULL,
  email text,
  phone text,
  pan_masked text,
  encrypted_pan text,
  bank_account_number text,
  bank_ifsc text,
  bank_account_holder_name text,
  payout_vendor_id text,
  instagram_handle text,
  youtube_channel text,
  kyc_status public.creator_kyc_status NOT NULL DEFAULT 'unverified',
  rejection_reason text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 2. Courses
CREATE TABLE public.courses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  title text NOT NULL,
  description text,
  category text,
  price integer NOT NULL DEFAULT 0,
  platform_commission_percent numeric NOT NULL DEFAULT 20,
  cover_image_url text,
  course_type text NOT NULL DEFAULT 'video',
  review_status public.course_review_status NOT NULL DEFAULT 'pending_review',
  rejection_reason text,
  is_visible boolean NOT NULL DEFAULT false,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- 3. Course modules
CREATE TABLE public.course_modules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE CASCADE,
  title text NOT NULL,
  content_type text NOT NULL,
  file_storage_path text NOT NULL,
  duration_label text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- 4. Purchases
CREATE TABLE public.course_purchases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  course_id uuid NOT NULL REFERENCES public.courses(id) ON DELETE RESTRICT,
  creator_id uuid REFERENCES public.creator_profiles(id) ON DELETE SET NULL,
  total_amount numeric NOT NULL,
  creator_payout_amount numeric NOT NULL,
  platform_fee_amount numeric NOT NULL,
  payment_status text NOT NULL DEFAULT 'pending',
  payment_reference_id text UNIQUE,
  split_transfer_id text,
  purchase_ip_address text,
  purchase_timestamp timestamptz NOT NULL DEFAULT now()
);

-- 5. Payout ledger
CREATE TABLE public.creator_payout_ledger (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE RESTRICT,
  purchase_id uuid REFERENCES public.course_purchases(id) ON DELETE SET NULL,
  amount numeric NOT NULL,
  status public.payout_ledger_status NOT NULL DEFAULT 'accrued',
  settled_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- GRANTS
GRANT SELECT (id, user_id, full_legal_name, email, phone, pan_masked, bank_ifsc, bank_account_holder_name, payout_vendor_id, instagram_handle, youtube_channel, kyc_status, rejection_reason, created_at, updated_at)
  ON public.creator_profiles TO authenticated;
GRANT SELECT (id, full_legal_name, instagram_handle, youtube_channel, kyc_status) ON public.creator_profiles TO anon;
GRANT INSERT (user_id, full_legal_name, email, phone, instagram_handle, youtube_channel) ON public.creator_profiles TO authenticated;
GRANT UPDATE (full_legal_name, email, phone, instagram_handle, youtube_channel) ON public.creator_profiles TO authenticated;
GRANT ALL ON public.creator_profiles TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.courses TO authenticated;
GRANT SELECT ON public.courses TO anon;
GRANT ALL ON public.courses TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_modules TO authenticated;
GRANT ALL ON public.course_modules TO service_role;

GRANT SELECT ON public.course_purchases TO authenticated;
GRANT ALL ON public.course_purchases TO service_role;

GRANT SELECT ON public.creator_payout_ledger TO authenticated;
GRANT ALL ON public.creator_payout_ledger TO service_role;

-- RLS
ALTER TABLE public.creator_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.courses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_modules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.course_purchases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.creator_payout_ledger ENABLE ROW LEVEL SECURITY;

-- helper: current user's creator id
CREATE OR REPLACE FUNCTION public.current_creator_id()
RETURNS uuid LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT id FROM public.creator_profiles WHERE user_id = auth.uid() LIMIT 1;
$$;

CREATE POLICY "Creators read own profile" ON public.creator_profiles
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.is_admin(auth.uid()));
CREATE POLICY "Public read approved creators" ON public.creator_profiles
  FOR SELECT TO anon USING (kyc_status = 'approved');
CREATE POLICY "Creators insert own profile" ON public.creator_profiles
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Creators update own profile" ON public.creator_profiles
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Public read live courses" ON public.courses
  FOR SELECT USING (
    (review_status = 'approved' AND is_visible = true
     AND EXISTS (SELECT 1 FROM public.creator_profiles c WHERE c.id = courses.creator_id AND c.kyc_status = 'approved'))
    OR creator_id = public.current_creator_id()
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Creators insert own courses" ON public.courses
  FOR INSERT TO authenticated WITH CHECK (creator_id = public.current_creator_id());
CREATE POLICY "Creators update own courses" ON public.courses
  FOR UPDATE TO authenticated
  USING (creator_id = public.current_creator_id() OR public.is_admin(auth.uid()))
  WITH CHECK (creator_id = public.current_creator_id() OR public.is_admin(auth.uid()));
CREATE POLICY "Creators delete own draft courses" ON public.courses
  FOR DELETE TO authenticated USING (creator_id = public.current_creator_id() AND review_status <> 'approved');

CREATE POLICY "Entitled users read modules" ON public.course_modules
  FOR SELECT TO authenticated USING (
    course_id IN (SELECT course_id FROM public.course_purchases WHERE user_id = auth.uid() AND payment_status = 'captured')
    OR course_id IN (SELECT id FROM public.courses WHERE creator_id = public.current_creator_id())
    OR public.is_admin(auth.uid())
  );
CREATE POLICY "Creators write own modules" ON public.course_modules
  FOR INSERT TO authenticated WITH CHECK (
    course_id IN (SELECT id FROM public.courses WHERE creator_id = public.current_creator_id())
  );
CREATE POLICY "Creators update own modules" ON public.course_modules
  FOR UPDATE TO authenticated USING (
    course_id IN (SELECT id FROM public.courses WHERE creator_id = public.current_creator_id())
  ) WITH CHECK (
    course_id IN (SELECT id FROM public.courses WHERE creator_id = public.current_creator_id())
  );
CREATE POLICY "Creators delete own modules" ON public.course_modules
  FOR DELETE TO authenticated USING (
    course_id IN (SELECT id FROM public.courses WHERE creator_id = public.current_creator_id())
  );

CREATE POLICY "Buyers creators admins read purchases" ON public.course_purchases
  FOR SELECT TO authenticated USING (
    user_id = auth.uid() OR creator_id = public.current_creator_id() OR public.is_admin(auth.uid())
  );

CREATE POLICY "Creators admins read ledger" ON public.creator_payout_ledger
  FOR SELECT TO authenticated USING (
    creator_id = public.current_creator_id() OR public.is_admin(auth.uid())
  );

-- updated_at triggers
CREATE TRIGGER trg_creator_profiles_updated BEFORE UPDATE ON public.creator_profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_advisor_apps();
CREATE TRIGGER trg_courses_updated BEFORE UPDATE ON public.courses
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_advisor_apps();

CREATE INDEX idx_courses_creator ON public.courses(creator_id);
CREATE INDEX idx_courses_status ON public.courses(review_status, is_visible);
CREATE INDEX idx_modules_course ON public.course_modules(course_id, sort_order);
CREATE INDEX idx_purchases_user ON public.course_purchases(user_id);
CREATE INDEX idx_purchases_creator ON public.course_purchases(creator_id);

-- Public marketplace listing (avoids exposing creator PII columns)
CREATE OR REPLACE FUNCTION public.list_public_courses()
RETURNS TABLE(
  id uuid, title text, description text, category text, price integer,
  cover_image_url text, course_type text, created_at timestamptz,
  creator_id uuid, creator_name text, module_count integer, purchase_count integer
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.description, c.category, c.price, c.cover_image_url,
         c.course_type, c.created_at, c.creator_id, cp.full_legal_name,
         (SELECT COUNT(*)::int FROM public.course_modules m WHERE m.course_id = c.id),
         (SELECT COUNT(*)::int FROM public.course_purchases p WHERE p.course_id = c.id AND p.payment_status = 'captured')
  FROM public.courses c
  JOIN public.creator_profiles cp ON cp.id = c.creator_id
  WHERE c.review_status = 'approved' AND c.is_visible = true AND cp.kyc_status = 'approved'
  ORDER BY c.created_at DESC;
$$;

CREATE OR REPLACE FUNCTION public.get_public_course(_course_id uuid)
RETURNS TABLE(
  id uuid, title text, description text, category text, price integer,
  cover_image_url text, course_type text, created_at timestamptz,
  creator_id uuid, creator_name text, instagram_handle text, youtube_channel text
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.title, c.description, c.category, c.price, c.cover_image_url,
         c.course_type, c.created_at, c.creator_id, cp.full_legal_name,
         cp.instagram_handle, cp.youtube_channel
  FROM public.courses c
  JOIN public.creator_profiles cp ON cp.id = c.creator_id
  WHERE c.id = _course_id AND c.review_status = 'approved' AND c.is_visible = true AND cp.kyc_status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.get_course_syllabus(_course_id uuid)
RETURNS TABLE(id uuid, title text, content_type text, duration_label text, sort_order integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT m.id, m.title, m.content_type, m.duration_label, m.sort_order
  FROM public.course_modules m
  JOIN public.courses c ON c.id = m.course_id
  WHERE m.course_id = _course_id AND c.review_status = 'approved' AND c.is_visible = true
  ORDER BY m.sort_order ASC;
$$;

CREATE OR REPLACE FUNCTION public.admin_list_pending_courses()
RETURNS SETOF public.courses LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY SELECT * FROM public.courses WHERE review_status = 'pending_review' ORDER BY created_at ASC;
END; $$;

CREATE OR REPLACE FUNCTION public.admin_review_course(_course_id uuid, _approve boolean, _reason text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  IF _approve THEN
    UPDATE public.courses
      SET review_status = 'approved', is_visible = true, rejection_reason = NULL,
          reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = _course_id;
  ELSE
    UPDATE public.courses
      SET review_status = 'rejected', is_visible = false,
          rejection_reason = COALESCE(_reason, 'No reason provided'),
          reviewed_by = auth.uid(), reviewed_at = now()
      WHERE id = _course_id;
  END IF;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_review_course(uuid, boolean, text) FROM anon;
REVOKE EXECUTE ON FUNCTION public.admin_list_pending_courses() FROM anon;