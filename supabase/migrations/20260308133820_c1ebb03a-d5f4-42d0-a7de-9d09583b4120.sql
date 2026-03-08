
-- Table 1: advisor_legal_acceptances
CREATE TABLE public.advisor_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id uuid REFERENCES public.advisors(id) NOT NULL,
  full_name text NOT NULL,
  sebi_reg_no text NOT NULL,
  pan_no text,
  checkbox_1_sebi_responsibility boolean NOT NULL DEFAULT false,
  checkbox_1_text text NOT NULL,
  checkbox_1_accepted_at timestamptz NOT NULL DEFAULT now(),
  checkbox_2_indemnity boolean NOT NULL DEFAULT false,
  checkbox_2_text text NOT NULL,
  checkbox_2_accepted_at timestamptz NOT NULL DEFAULT now(),
  ip_address text,
  user_agent text,
  device_info text,
  form_submitted_at timestamptz NOT NULL DEFAULT now(),
  company_cin text NOT NULL DEFAULT 'U62099MH2025PTC453360',
  status text NOT NULL DEFAULT 'submitted'
);

ALTER TABLE public.advisor_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Advisors can only read their own rows
CREATE POLICY "Advisors read own legal acceptances"
ON public.advisor_legal_acceptances FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.advisors
    WHERE advisors.id = advisor_legal_acceptances.advisor_id
    AND advisors.user_id = auth.uid()
  )
);

-- Admin can read all
CREATE POLICY "Admin read all advisor legal acceptances"
ON public.advisor_legal_acceptances FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Insert allowed for authenticated users (at time of acceptance)
CREATE POLICY "Insert advisor legal acceptance"
ON public.advisor_legal_acceptances FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.advisors
    WHERE advisors.id = advisor_legal_acceptances.advisor_id
    AND advisors.user_id = auth.uid()
  )
);

-- No UPDATE or DELETE policies = immutable

-- Table 2: user_legal_acceptances
CREATE TABLE public.user_legal_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  full_name text,
  email text,
  acceptance_type text NOT NULL,
  checkbox_text text NOT NULL,
  accepted boolean NOT NULL DEFAULT false,
  ip_address text,
  user_agent text,
  device_info text,
  accepted_at timestamptz NOT NULL DEFAULT now(),
  page_url text,
  company_cin text NOT NULL DEFAULT 'U62099MH2025PTC453360'
);

ALTER TABLE public.user_legal_acceptances ENABLE ROW LEVEL SECURITY;

-- Users can only read their own rows
CREATE POLICY "Users read own legal acceptances"
ON public.user_legal_acceptances FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Admin can read all
CREATE POLICY "Admin read all user legal acceptances"
ON public.user_legal_acceptances FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- Insert allowed for own user
CREATE POLICY "Insert user legal acceptance"
ON public.user_legal_acceptances FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- No UPDATE or DELETE policies = immutable
