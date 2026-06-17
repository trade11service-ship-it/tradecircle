DROP POLICY IF EXISTS "Insert own subscription" ON public.subscriptions;
-- Service role bypasses RLS and is used by razorpay-webhook + sandbox-confirm-subscription
-- to create subscription rows after a payment is verified server-side.