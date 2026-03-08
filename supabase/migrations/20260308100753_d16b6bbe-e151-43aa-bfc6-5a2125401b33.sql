
-- Signal delivery tracking table
CREATE TABLE public.signal_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  signal_id uuid REFERENCES public.signals(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  advisor_id uuid REFERENCES public.advisors(id) ON DELETE CASCADE NOT NULL,
  group_id uuid REFERENCES public.groups(id) ON DELETE CASCADE NOT NULL,
  delivered_at timestamptz NOT NULL DEFAULT now(),
  delivery_method text NOT NULL DEFAULT 'telegram',
  status text NOT NULL DEFAULT 'sent'
);

ALTER TABLE public.signal_deliveries ENABLE ROW LEVEL SECURITY;

-- Users can view their own deliveries
CREATE POLICY "View own deliveries" ON public.signal_deliveries
  FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- Advisors can view deliveries for their signals
CREATE POLICY "Advisor view deliveries" ON public.signal_deliveries
  FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.advisors WHERE advisors.id = signal_deliveries.advisor_id AND advisors.user_id = auth.uid()
  ));

-- Admin can view all
CREATE POLICY "Admin view all deliveries" ON public.signal_deliveries
  FOR SELECT TO authenticated
  USING (public.is_admin(auth.uid()));

-- Edge functions insert deliveries (service role)
CREATE POLICY "Service insert deliveries" ON public.signal_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Enable realtime for signals table (for telegram trigger)
ALTER PUBLICATION supabase_realtime ADD TABLE public.signal_deliveries;
