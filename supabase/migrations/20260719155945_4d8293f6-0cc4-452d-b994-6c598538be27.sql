
-- Revoke broad SELECT so column-level grants take effect.
REVOKE SELECT ON public.advisors FROM anon;
REVOKE SELECT ON public.advisors FROM authenticated;

-- Public, non-sensitive columns only.
GRANT SELECT (
  id, user_id, full_name, sebi_reg_no, profile_photo_url, bio, strategy_type,
  status, rejection_reason, created_at, cover_image_url, is_public_featured,
  public_sort_order, public_tagline, public_description, public_years_experience,
  risk_level, preferred_trading_hours
) ON public.advisors TO anon, authenticated;

-- Service role and existing SECURITY DEFINER RPCs still see everything.
GRANT ALL ON public.advisors TO service_role;
