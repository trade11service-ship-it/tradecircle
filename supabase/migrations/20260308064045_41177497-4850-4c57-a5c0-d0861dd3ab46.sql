
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  phone TEXT,
  role TEXT CHECK (role IN ('trader', 'advisor', 'admin')) DEFAULT 'trader',
  telegram_username TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public profiles viewable" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), COALESCE(NEW.raw_user_meta_data->>'role', 'trader'));
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Create advisors table
CREATE TABLE public.advisors (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  full_name TEXT NOT NULL, email TEXT NOT NULL, phone TEXT, address TEXT,
  sebi_reg_no TEXT UNIQUE NOT NULL, aadhaar_no TEXT, pan_no TEXT,
  profile_photo_url TEXT, aadhaar_photo_url TEXT, pan_photo_url TEXT,
  bio TEXT,
  strategy_type TEXT CHECK (strategy_type IN ('Options', 'Equity', 'Futures', 'All')),
  status TEXT CHECK (status IN ('pending', 'approved', 'rejected', 'suspended')) DEFAULT 'pending',
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.advisors ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View approved or own advisors" ON public.advisors FOR SELECT USING (status = 'approved' OR auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Insert own advisor" ON public.advisors FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own or admin advisor" ON public.advisors FOR UPDATE USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));

-- Create groups table
CREATE TABLE public.groups (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL, description TEXT, dp_url TEXT,
  monthly_price INTEGER NOT NULL, razorpay_payment_link TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone view groups" ON public.groups FOR SELECT USING (true);
CREATE POLICY "Advisor insert own groups" ON public.groups FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()));
CREATE POLICY "Advisor update own groups" ON public.groups FOR UPDATE USING (EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()));

-- Create subscriptions table (before signals policies need it)
CREATE TABLE public.subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE NOT NULL,
  start_date TIMESTAMP WITH TIME ZONE DEFAULT now(), end_date TIMESTAMP WITH TIME ZONE,
  status TEXT CHECK (status IN ('active', 'expired', 'cancelled')) DEFAULT 'active',
  amount_paid INTEGER, razorpay_payment_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own subscriptions" ON public.subscriptions FOR SELECT USING (auth.uid() = user_id OR EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()));
CREATE POLICY "Insert own subscription" ON public.subscriptions FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Create signals table
CREATE TABLE public.signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE NOT NULL,
  instrument TEXT NOT NULL,
  signal_type TEXT CHECK (signal_type IN ('BUY', 'SELL')) NOT NULL,
  entry_price DECIMAL NOT NULL, target_price DECIMAL NOT NULL, stop_loss DECIMAL NOT NULL,
  timeframe TEXT CHECK (timeframe IN ('Intraday', 'Swing', 'Positional')) NOT NULL,
  notes TEXT, result TEXT CHECK (result IN ('PENDING', 'WIN', 'LOSS')) DEFAULT 'PENDING',
  signal_date DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View signals" ON public.signals FOR SELECT USING (
  signal_date < CURRENT_DATE
  OR EXISTS (SELECT 1 FROM public.subscriptions WHERE subscriptions.user_id = auth.uid() AND subscriptions.group_id = signals.group_id AND subscriptions.status = 'active' AND subscriptions.end_date >= now())
  OR EXISTS (SELECT 1 FROM public.advisors WHERE advisors.id = signals.advisor_id AND advisors.user_id = auth.uid())
);
CREATE POLICY "Advisor insert signals" ON public.signals FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.groups g JOIN public.advisors a ON a.id = g.advisor_id WHERE g.id = group_id AND a.user_id = auth.uid()));
CREATE POLICY "Advisor update signals" ON public.signals FOR UPDATE USING (EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()));

-- Create telegram_settings
CREATE TABLE public.telegram_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  telegram_username TEXT, is_active BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(user_id, group_id)
);

ALTER TABLE public.telegram_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own telegram" ON public.telegram_settings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Insert own telegram" ON public.telegram_settings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Update own telegram" ON public.telegram_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create kyc_documents
CREATE TABLE public.kyc_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  advisor_id UUID REFERENCES public.advisors(id) ON DELETE CASCADE NOT NULL,
  document_type TEXT CHECK (document_type IN ('aadhaar', 'pan', 'profile')) NOT NULL,
  file_url TEXT NOT NULL, uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

ALTER TABLE public.kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View own kyc" ON public.kyc_documents FOR SELECT USING (EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'));
CREATE POLICY "Insert own kyc" ON public.kyc_documents FOR INSERT WITH CHECK (EXISTS (SELECT 1 FROM public.advisors WHERE id = advisor_id AND user_id = auth.uid()));

-- Storage
INSERT INTO storage.buckets (id, name, public) VALUES ('kyc-documents', 'kyc-documents', true);
CREATE POLICY "Upload KYC" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'kyc-documents');
CREATE POLICY "View KYC" ON storage.objects FOR SELECT USING (bucket_id = 'kyc-documents');

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.signals;
ALTER PUBLICATION supabase_realtime ADD TABLE public.subscriptions;
