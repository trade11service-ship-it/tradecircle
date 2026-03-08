
DROP POLICY "Service insert deliveries" ON public.signal_deliveries;
CREATE POLICY "Insert own deliveries" ON public.signal_deliveries
  FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
