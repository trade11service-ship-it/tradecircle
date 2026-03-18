import { supabase } from '@/integrations/supabase/client';

/**
 * Check if a user has active subscription to a specific group.
 * CORE RULE: Each subscription = ONE group only.
 * Checks: user_id + group_id + status=active + end_date > now()
 */
export async function checkGroupAccess(userId: string, groupId: string): Promise<{ hasAccess: boolean; expiresAt: string | null; isExpired: boolean }> {
  const { data } = await supabase
    .from('subscriptions')
    .select('id, end_date, status')
    .eq('user_id', userId)
    .eq('group_id', groupId)
    .eq('status', 'active')
    .order('end_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!data) return { hasAccess: false, expiresAt: null, isExpired: false };

  const endDate = data.end_date ? new Date(data.end_date) : null;
  const now = new Date();

  if (endDate && endDate < now) {
    return { hasAccess: false, expiresAt: data.end_date, isExpired: true };
  }

  return { hasAccess: true, expiresAt: data.end_date, isExpired: false };
}

/**
 * Get all group IDs user has active access to.
 * Checks end_date > now() for each.
 */
export async function getActiveGroupIds(userId: string): Promise<string[]> {
  const now = new Date().toISOString();
  const { data } = await supabase
    .from('subscriptions')
    .select('group_id, end_date')
    .eq('user_id', userId)
    .eq('status', 'active')
    .gte('end_date', now);

  return [...new Set((data || []).map(s => s.group_id))];
}

/**
 * Check if a signal should be shown free (F&O 24h rule or public_after_24h).
 * 
 * Rules:
 * - F&O signals (timeframe contains FNO/F&O/Options) → free after 24h regardless of toggle
 * - Non-F&O: if is_public=true AND created_at > 24h ago → free
 * - Analysis posts (post_type='message') → always public
 */
export function shouldShowFree(post: {
  post_type: string;
  timeframe: string | null;
  is_public: boolean;
  created_at: string | null;
  signal_type: string | null;
}): { isFree: boolean; reason: 'fno_expired' | 'public_delayed' | 'analysis' | null } {
  // Analysis posts are always public
  if (post.post_type === 'message') {
    return { isFree: true, reason: 'analysis' };
  }

  const createdAt = post.created_at ? new Date(post.created_at) : null;
  const hoursSincePost = createdAt ? (Date.now() - createdAt.getTime()) / (1000 * 60 * 60) : 0;

  // F&O check - timeframe or signal_type contains FNO/F&O/Options
  const isFnO = isFnOSignal(post.timeframe, post.signal_type);

  if (isFnO && hoursSincePost > 24) {
    return { isFree: true, reason: 'fno_expired' };
  }

  // Non-F&O: check is_public toggle (public_after_24h)
  if (post.is_public && hoursSincePost > 24) {
    return { isFree: true, reason: 'public_delayed' };
  }

  return { isFree: false, reason: null };
}

function isFnOSignal(timeframe: string | null, signalType: string | null): boolean {
  const combined = `${timeframe || ''} ${signalType || ''}`.toLowerCase();
  return combined.includes('f&o') || combined.includes('fno') || combined.includes('options') || combined.includes('futures');
}

/**
 * Determine visibility for a post in the feed.
 * Returns what to show and how.
 */
export function getPostVisibility(
  post: { post_type: string; timeframe: string | null; is_public: boolean; created_at: string | null; signal_type: string | null },
  isSubscribed: boolean,
  isOwner: boolean,
  globalIndex: number,
): {
  showFully: boolean;
  blurNumbers: boolean;
  hideCompletely: boolean;
  showLockOverlay: boolean;
  freeBadge: string | null;
} {
  // Owner always sees everything
  if (isOwner) {
    return { showFully: true, blurNumbers: false, hideCompletely: false, showLockOverlay: false, freeBadge: null };
  }

  // Subscriber sees everything in their subscribed group
  if (isSubscribed) {
    return { showFully: true, blurNumbers: false, hideCompletely: false, showLockOverlay: false, freeBadge: null };
  }

  // Non-subscriber logic
  const freeCheck = shouldShowFree(post);

  if (freeCheck.isFree) {
    const badge = freeCheck.reason === 'fno_expired' ? 'F&O Signal — 24hr delay'
      : freeCheck.reason === 'public_delayed' ? 'Free — Signal expired'
      : null; // analysis posts don't need badge
    return { showFully: true, blurNumbers: false, hideCompletely: false, showLockOverlay: false, freeBadge: badge };
  }

  // First 3 posts visible (free tier)
  const FREE_VISIBLE = 3;

  if (globalIndex < FREE_VISIBLE) {
    // Show analysis fully, signal with blurred numbers
    if (post.post_type === 'signal') {
      return { showFully: false, blurNumbers: true, hideCompletely: false, showLockOverlay: false, freeBadge: null };
    }
    return { showFully: true, blurNumbers: false, hideCompletely: false, showLockOverlay: false, freeBadge: null };
  }

  // After 3rd post: show lock overlay on the 3rd boundary, hide rest
  if (globalIndex === FREE_VISIBLE) {
    return { showFully: false, blurNumbers: true, hideCompletely: false, showLockOverlay: true, freeBadge: null };
  }

  return { showFully: false, blurNumbers: false, hideCompletely: true, showLockOverlay: false, freeBadge: null };
}

/**
 * Check if subscription is expiring soon (within 3 days).
 */
export function getExpiryStatus(endDate: string | null): { daysLeft: number | null; isExpiringSoon: boolean; isExpired: boolean; message: string | null } {
  if (!endDate) return { daysLeft: null, isExpiringSoon: false, isExpired: false, message: null };

  const end = new Date(endDate);
  const now = new Date();
  const diffMs = end.getTime() - now.getTime();
  const daysLeft = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (daysLeft < 0) {
    return { daysLeft: 0, isExpiringSoon: false, isExpired: true, message: 'Your subscription has expired' };
  }
  if (daysLeft <= 3) {
    return { daysLeft, isExpiringSoon: true, isExpired: false, message: `Your subscription expires in ${daysLeft} day${daysLeft !== 1 ? 's' : ''}` };
  }
  return { daysLeft, isExpiringSoon: false, isExpired: false, message: null };
}
