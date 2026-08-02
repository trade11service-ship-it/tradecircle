/**
 * Columns of `public.groups` that client roles are allowed to read.
 * Advisor payment-gateway credentials (advisor_merchant_key_id,
 * advisor_merchant_key_secret, advisor_payment_url) are revoked at the database level and are only
 * ever accessed server-side by edge functions, so never select `*` here.
 */
export const GROUP_PUBLIC_COLUMNS =
  'id, advisor_id, name, description, dp_url, monthly_price, razorpay_payment_link, is_active, created_at, strategy_category, payment_mode, duration_days';
