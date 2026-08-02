/**
 * Shared Razorpay credential inspection.
 *
 * Sandbox mode must ONLY be active when no usable Razorpay credential exists.
 * Real Razorpay test-mode keys (`rzp_test_...`) are genuine credentials: the
 * hosted test checkout must run, otherwise any signed-in user could mint a
 * paid subscription for free through the sandbox confirmation endpoint.
 */
export function isPlaceholderKey(value?: string | null): boolean {
  if (!value) return true;
  const v = value.trim();
  if (v.length < 12) return true;
  // Genuine Razorpay keys (test or live) are never placeholders.
  if (/^rzp_(test|live)_[A-Za-z0-9]{6,}$/.test(v)) return false;
  return /sandbox|placeholder|fake|xxx|dummy|your_|changeme|example/i.test(v);
}

export function isRazorpaySandbox(keyId?: string | null, keySecret?: string | null): boolean {
  return isPlaceholderKey(keyId) || isPlaceholderKey(keySecret);
}
