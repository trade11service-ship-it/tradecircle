
-- Allow admin to delete signals (advisor posts)
CREATE POLICY "Admin delete signals" ON public.signals
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Allow admin to delete groups  
CREATE POLICY "Admin delete groups" ON public.groups
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Allow admin to delete advisors
CREATE POLICY "Admin delete advisors" ON public.advisors
FOR DELETE TO authenticated
USING (is_admin(auth.uid()));

-- Add strategy_category column to groups for categorization
ALTER TABLE public.groups ADD COLUMN IF NOT EXISTS strategy_category text DEFAULT 'All';
