/**
 * Columns of `public.groups` that client roles are allowed to read.
 * Advisor payment-gateway credentials now live in `group_payment_credentials`,
 * a service-role-only table that is never exposed to the Data API or Realtime.
 */
export const GROUP_PUBLIC_COLUMNS =
  'id, advisor_id, name, description, dp_url, monthly_price, razorpay_payment_link, is_active, created_at, strategy_category, payment_mode, duration_days';
