-- 1. Creator public profile fields
ALTER TABLE public.creator_profiles
  ADD COLUMN IF NOT EXISTS avatar_url text,
  ADD COLUMN IF NOT EXISTS banner_url text,
  ADD COLUMN IF NOT EXISTS bio text,
  ADD COLUMN IF NOT EXISTS intro_video_url text;

-- 2. Purchase accounting fields
ALTER TABLE public.course_purchases
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS razorpay_order_id text,
  ADD COLUMN IF NOT EXISTS invoice_number text;

CREATE SEQUENCE IF NOT EXISTS public.course_invoice_seq START 1000;

CREATE OR REPLACE FUNCTION public.set_course_invoice_number()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'RAC-CRS-' || to_char(now(), 'YYYY') || '-' || nextval('public.course_invoice_seq')::text;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_course_invoice_number ON public.course_purchases;
CREATE TRIGGER trg_course_invoice_number BEFORE INSERT ON public.course_purchases
FOR EACH ROW EXECUTE FUNCTION public.set_course_invoice_number();

-- 3. Payout requests
CREATE TABLE IF NOT EXISTS public.creator_payout_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL REFERENCES public.creator_profiles(id) ON DELETE CASCADE,
  period_start date NOT NULL,
  period_end date NOT NULL,
  amount numeric NOT NULL CHECK (amount > 0),
  status text NOT NULL DEFAULT 'requested',
  admin_reference text,
  admin_note text,
  requested_at timestamptz NOT NULL DEFAULT now(),
  paid_at timestamptz,
  processed_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.creator_payout_requests TO authenticated;
GRANT ALL ON public.creator_payout_requests TO service_role;
ALTER TABLE public.creator_payout_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Creators read own payout requests" ON public.creator_payout_requests
FOR SELECT TO authenticated
USING (creator_id = public.current_creator_id() OR public.is_admin(auth.uid()));

CREATE POLICY "Creators create own payout requests" ON public.creator_payout_requests
FOR INSERT TO authenticated
WITH CHECK (creator_id = public.current_creator_id() AND status = 'requested');

DROP TRIGGER IF EXISTS trg_payout_requests_updated ON public.creator_payout_requests;
CREATE TRIGGER trg_payout_requests_updated BEFORE UPDATE ON public.creator_payout_requests
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_advisor_apps();

CREATE INDEX IF NOT EXISTS idx_payout_requests_creator ON public.creator_payout_requests(creator_id, status);

-- 4. Creator payout summary
CREATE OR REPLACE FUNCTION public.creator_payout_summary()
RETURNS json LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid uuid := public.current_creator_id();
  _accrued numeric := 0; _paid numeric := 0; _pending_req numeric := 0;
  _sales int := 0; _gross numeric := 0;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'not a creator'; END IF;

  SELECT COALESCE(SUM(amount) FILTER (WHERE status = 'accrued'), 0),
         COALESCE(SUM(amount) FILTER (WHERE status = 'paid'), 0)
    INTO _accrued, _paid
  FROM public.creator_payout_ledger WHERE creator_id = _cid;

  SELECT COALESCE(SUM(amount), 0) INTO _pending_req
  FROM public.creator_payout_requests
  WHERE creator_id = _cid AND status = 'requested';

  SELECT COUNT(*), COALESCE(SUM(total_amount), 0) INTO _sales, _gross
  FROM public.course_purchases
  WHERE creator_id = _cid AND payment_status = 'captured';

  RETURN json_build_object(
    'unsettled', _accrued,
    'settled', _paid,
    'pending_requests', _pending_req,
    'available', GREATEST(_accrued - _pending_req, 0),
    'sales_count', _sales,
    'gross_revenue', _gross
  );
END; $$;

REVOKE EXECUTE ON FUNCTION public.creator_payout_summary() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_payout_summary() TO authenticated;

-- 5. Creator requests payout (weekend window, Sun-Sat settlement, IST)
CREATE OR REPLACE FUNCTION public.creator_request_payout()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  _cid uuid := public.current_creator_id();
  _kyc creator_kyc_status;
  _available numeric := 0;
  _pending numeric := 0;
  _dow int;
  _ist timestamptz := now() AT TIME ZONE 'Asia/Kolkata';
  _period_end date;
  _new_id uuid;
BEGIN
  IF _cid IS NULL THEN RAISE EXCEPTION 'not a creator'; END IF;

  SELECT kyc_status INTO _kyc FROM public.creator_profiles WHERE id = _cid;
  IF _kyc <> 'approved' THEN RAISE EXCEPTION 'complete KYC before requesting a payout'; END IF;

  _dow := EXTRACT(DOW FROM (now() AT TIME ZONE 'Asia/Kolkata'))::int; -- 0=Sun, 6=Sat
  IF _dow NOT IN (0, 6) THEN
    RAISE EXCEPTION 'payout requests open only on Saturday and Sunday';
  END IF;

  SELECT COALESCE(SUM(amount), 0) INTO _available
  FROM public.creator_payout_ledger WHERE creator_id = _cid AND status = 'accrued';

  SELECT COALESCE(SUM(amount), 0) INTO _pending
  FROM public.creator_payout_requests WHERE creator_id = _cid AND status = 'requested';

  _available := _available - _pending;
  IF _available < 500 THEN RAISE EXCEPTION 'minimum payout is Rs.500 (available: %)', _available; END IF;

  _period_end := (now() AT TIME ZONE 'Asia/Kolkata')::date;
  IF _dow = 0 THEN _period_end := _period_end - 1; END IF;

  INSERT INTO public.creator_payout_requests (creator_id, period_start, period_end, amount)
  VALUES (_cid, _period_end - 6, _period_end, _available)
  RETURNING id INTO _new_id;

  RETURN _new_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.creator_request_payout() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_request_payout() TO authenticated;

-- 6. Admin: creator earnings overview
CREATE OR REPLACE FUNCTION public.admin_list_creator_earnings()
RETURNS TABLE(
  creator_id uuid, full_legal_name text, email text, phone text,
  instagram_handle text, youtube_channel text, kyc_status text,
  courses_live int, courses_pending int, courses_draft int,
  sales_count int, gross_revenue numeric, platform_fee numeric,
  creator_net numeric, settled numeric, unsettled numeric, pending_requests numeric,
  created_at timestamptz
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT cp.id, cp.full_legal_name, cp.email, cp.phone,
         cp.instagram_handle, cp.youtube_channel, cp.kyc_status::text,
         (SELECT COUNT(*)::int FROM public.courses c WHERE c.creator_id = cp.id AND c.review_status = 'approved'),
         (SELECT COUNT(*)::int FROM public.courses c WHERE c.creator_id = cp.id AND c.review_status = 'pending_review'),
         (SELECT COUNT(*)::int FROM public.courses c WHERE c.creator_id = cp.id AND c.review_status = 'draft'),
         (SELECT COUNT(*)::int FROM public.course_purchases p WHERE p.creator_id = cp.id AND p.payment_status = 'captured'),
         (SELECT COALESCE(SUM(p.total_amount),0) FROM public.course_purchases p WHERE p.creator_id = cp.id AND p.payment_status = 'captured'),
         (SELECT COALESCE(SUM(p.platform_fee_amount),0) FROM public.course_purchases p WHERE p.creator_id = cp.id AND p.payment_status = 'captured'),
         (SELECT COALESCE(SUM(p.creator_payout_amount),0) FROM public.course_purchases p WHERE p.creator_id = cp.id AND p.payment_status = 'captured'),
         (SELECT COALESCE(SUM(l.amount),0) FROM public.creator_payout_ledger l WHERE l.creator_id = cp.id AND l.status = 'paid'),
         (SELECT COALESCE(SUM(l.amount),0) FROM public.creator_payout_ledger l WHERE l.creator_id = cp.id AND l.status = 'accrued'),
         (SELECT COALESCE(SUM(r.amount),0) FROM public.creator_payout_requests r WHERE r.creator_id = cp.id AND r.status = 'requested'),
         cp.created_at
  FROM public.creator_profiles cp
  ORDER BY cp.created_at DESC;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_creator_earnings() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_creator_earnings() TO authenticated;

-- 7. Admin: purchases for a creator (or all)
CREATE OR REPLACE FUNCTION public.admin_list_course_purchases(_creator_id uuid DEFAULT NULL)
RETURNS TABLE(
  id uuid, purchase_timestamp timestamptz, invoice_number text,
  buyer_name text, buyer_email text, course_id uuid, course_title text,
  creator_id uuid, creator_name text, total_amount numeric,
  platform_fee_amount numeric, creator_payout_amount numeric,
  payment_status text, payment_reference_id text, payment_method text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT p.id, p.purchase_timestamp, p.invoice_number,
         COALESCE(pr.full_name, 'User'), pr.email, p.course_id, c.title,
         p.creator_id, cp.full_legal_name, p.total_amount,
         p.platform_fee_amount, p.creator_payout_amount,
         p.payment_status, p.payment_reference_id, p.payment_method
  FROM public.course_purchases p
  LEFT JOIN public.profiles pr ON pr.id = p.user_id
  LEFT JOIN public.courses c ON c.id = p.course_id
  LEFT JOIN public.creator_profiles cp ON cp.id = p.creator_id
  WHERE (_creator_id IS NULL OR p.creator_id = _creator_id)
  ORDER BY p.purchase_timestamp DESC
  LIMIT 500;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_course_purchases(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_course_purchases(uuid) TO authenticated;

-- 8. Admin: payout request queue + mark paid
CREATE OR REPLACE FUNCTION public.admin_list_payout_requests()
RETURNS TABLE(
  id uuid, creator_id uuid, creator_name text, creator_email text,
  period_start date, period_end date, amount numeric, status text,
  admin_reference text, requested_at timestamptz, paid_at timestamptz,
  bank_masked text, kyc_status text
)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  RETURN QUERY
  SELECT r.id, r.creator_id, cp.full_legal_name, cp.email,
         r.period_start, r.period_end, r.amount, r.status,
         r.admin_reference, r.requested_at, r.paid_at,
         CASE WHEN cp.bank_account_number IS NULL THEN NULL
              ELSE 'XXXX' || right(cp.bank_account_number, 4) END,
         cp.kyc_status::text
  FROM public.creator_payout_requests r
  JOIN public.creator_profiles cp ON cp.id = r.creator_id
  ORDER BY (r.status = 'requested') DESC, r.requested_at DESC;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_list_payout_requests() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_list_payout_requests() TO authenticated;

CREATE OR REPLACE FUNCTION public.admin_mark_payout_paid(_request_id uuid, _reference text, _note text DEFAULT NULL)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _r public.creator_payout_requests%ROWTYPE; _remaining numeric;
BEGIN
  IF NOT public.is_admin(auth.uid()) THEN RAISE EXCEPTION 'forbidden'; END IF;
  SELECT * INTO _r FROM public.creator_payout_requests WHERE id = _request_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'request not found'; END IF;
  IF _r.status = 'paid' THEN RAISE EXCEPTION 'already paid'; END IF;

  _remaining := _r.amount;
  UPDATE public.creator_payout_ledger l
     SET status = 'paid', settled_at = now()
   WHERE l.id IN (
     SELECT id FROM public.creator_payout_ledger
     WHERE creator_id = _r.creator_id AND status = 'accrued'
     ORDER BY created_at ASC
   );

  UPDATE public.creator_payout_requests
     SET status = 'paid', paid_at = now(), admin_reference = _reference,
         admin_note = _note, processed_by = auth.uid()
   WHERE id = _request_id;
END; $$;

REVOKE EXECUTE ON FUNCTION public.admin_mark_payout_paid(uuid, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_mark_payout_paid(uuid, text, text) TO authenticated;

-- 9. Creator: safe course delete / unlist
CREATE OR REPLACE FUNCTION public.creator_delete_course(_course_id uuid)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _cid uuid := public.current_creator_id(); _owner uuid; _sales int;
BEGIN
  SELECT creator_id INTO _owner FROM public.courses WHERE id = _course_id;
  IF _owner IS NULL THEN RAISE EXCEPTION 'course not found'; END IF;
  IF NOT (public.is_admin(auth.uid()) OR _owner = _cid) THEN RAISE EXCEPTION 'forbidden'; END IF;

  SELECT COUNT(*)::int INTO _sales FROM public.course_purchases
   WHERE course_id = _course_id AND payment_status = 'captured';

  IF _sales > 0 THEN
    UPDATE public.courses SET is_visible = false WHERE id = _course_id;
    RETURN 'unlisted';
  END IF;

  DELETE FROM public.course_modules WHERE course_id = _course_id;
  DELETE FROM public.courses WHERE id = _course_id;
  RETURN 'deleted';
END; $$;

REVOKE EXECUTE ON FUNCTION public.creator_delete_course(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.creator_delete_course(uuid) TO authenticated;

-- 10. Public creator profile lookups
CREATE OR REPLACE FUNCTION public.get_public_creator(_creator_id uuid)
RETURNS TABLE(id uuid, full_legal_name text, avatar_url text, banner_url text,
  bio text, intro_video_url text, instagram_handle text, youtube_channel text,
  course_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.id, cp.full_legal_name, cp.avatar_url, cp.banner_url, cp.bio,
         cp.intro_video_url, cp.instagram_handle, cp.youtube_channel,
         (SELECT COUNT(*)::int FROM public.courses c
           WHERE c.creator_id = cp.id AND c.review_status = 'approved' AND c.is_visible = true)
  FROM public.creator_profiles cp
  WHERE cp.id = _creator_id AND cp.kyc_status = 'approved';
$$;

CREATE OR REPLACE FUNCTION public.list_public_creators()
RETURNS TABLE(id uuid, full_legal_name text, avatar_url text, bio text,
  instagram_handle text, youtube_channel text, course_count int)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT cp.id, cp.full_legal_name, cp.avatar_url, cp.bio,
         cp.instagram_handle, cp.youtube_channel,
         (SELECT COUNT(*)::int FROM public.courses c
           WHERE c.creator_id = cp.id AND c.review_status = 'approved' AND c.is_visible = true)
  FROM public.creator_profiles cp
  WHERE cp.kyc_status = 'approved'
  ORDER BY cp.created_at DESC
  LIMIT 24;
$$;

-- 11. SECURITY: block advisor self-approval
CREATE OR REPLACE FUNCTION public.guard_advisor_privileged_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  NEW.status := OLD.status;
  NEW.kyc_status := OLD.kyc_status;
  NEW.kyc_rejection_reason := OLD.kyc_rejection_reason;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.is_public_featured := OLD.is_public_featured;
  NEW.public_sort_order := OLD.public_sort_order;
  NEW.user_id := OLD.user_id;
  NEW.sebi_reg_no := OLD.sebi_reg_no;
  NEW.encrypted_pan := OLD.encrypted_pan;
  NEW.pan_masked := OLD.pan_masked;
  NEW.bank_account_number := OLD.bank_account_number;
  NEW.bank_ifsc := OLD.bank_ifsc;
  NEW.bank_account_holder_name := OLD.bank_account_holder_name;
  NEW.payout_vendor_id := OLD.payout_vendor_id;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_advisor_privileged ON public.advisors;
CREATE TRIGGER trg_guard_advisor_privileged BEFORE UPDATE ON public.advisors
FOR EACH ROW EXECUTE FUNCTION public.guard_advisor_privileged_columns();

-- 12. SECURITY: block creator course self-approval
CREATE OR REPLACE FUNCTION public.guard_course_moderation_columns()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.is_admin(auth.uid()) OR auth.uid() IS NULL THEN
    RETURN NEW;
  END IF;
  IF NEW.review_status IS DISTINCT FROM OLD.review_status
     AND NEW.review_status = 'approved'::course_review_status THEN
    NEW.review_status := OLD.review_status;
  END IF;
  IF OLD.review_status <> 'approved'::course_review_status THEN
    NEW.is_visible := OLD.is_visible;
  END IF;
  NEW.rejection_reason := OLD.rejection_reason;
  NEW.reviewed_by := OLD.reviewed_by;
  NEW.reviewed_at := OLD.reviewed_at;
  NEW.creator_id := OLD.creator_id;
  NEW.platform_commission_percent := OLD.platform_commission_percent;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS trg_guard_course_moderation ON public.courses;
CREATE TRIGGER trg_guard_course_moderation BEFORE UPDATE ON public.courses
FOR EACH ROW EXECUTE FUNCTION public.guard_course_moderation_columns();