/**
 * Client-side compliance scrubber for the course marketplace.
 * Mirrors supabase/functions/_shared/courses.ts — keep both lists in sync.
 */

export const BANNED_WORDS = [
  'guaranteed',
  'guarantee',
  '100% profit',
  '100% returns',
  'sure shot',
  'sureshot',
  'jackpot',
  'daily earnings',
  'assured returns',
  'risk free',
  'risk-free',
  'multibagger',
  'tips',
  'intraday tips',
  'buy call',
  'sell call',
  'profit guaranteed',
  'double your money',
  'fixed returns',
  'no loss',
];

export function findBannedWords(...blocks: (string | null | undefined)[]): string[] {
  const haystack = blocks.filter(Boolean).join(' \n ').toLowerCase();
  const hits = new Set<string>();
  for (const word of BANNED_WORDS) {
    const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    if (new RegExp(`(^|[^a-z0-9])${escaped}([^a-z0-9]|$)`, 'i').test(haystack)) hits.add(word);
  }
  return [...hits];
}

export const PLATFORM_COMMISSION_PERCENT = 20;

export function splitAmount(total: number, commissionPercent = PLATFORM_COMMISSION_PERCENT) {
  const platform = Math.round(total * (commissionPercent / 100));
  return { platformFee: platform, creatorNet: total - platform };
}

export const COURSE_CATEGORIES = [
  'Technical Analysis',
  'Options & Derivatives',
  'Price Action',
  'Fundamental Analysis',
  'Risk Management',
  'Trading Psychology',
  'Market Basics',
];

export const EDU_DISCLAIMER =
  'All courses on RA Circle are strictly for educational purposes and do not contain live stock recommendations or investment advice.';

export function formatINR(value: number) {
  return `\u20B9${Number(value || 0).toLocaleString('en-IN')}`;
}
