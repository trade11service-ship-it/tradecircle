/**
 * Canonical origin for auth email links and OAuth redirects.
 * Pins to https://racircle.in on any production host so verification / reset
 * links never point at stockcircle.lovable.app or preview URLs.
 * Falls back to window.location.origin for localhost dev.
 */
export function getCanonicalOrigin(): string {
  if (typeof window === 'undefined') return 'https://racircle.in';
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1' || host.endsWith('.local')) {
    return window.location.origin;
  }
  return 'https://racircle.in';
}
