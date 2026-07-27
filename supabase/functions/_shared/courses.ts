// Shared helpers for the Educational Course Marketplace.
// Strictly isolated from the SEBI advisor compliance pipeline: nothing here
// writes to compliance_logs, client_onboarding or the compliance-vault bucket.

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

/** Returns the banned words found inside the supplied text blocks. */
export function findBannedWords(...blocks: (string | null | undefined)[]): string[] {
  const haystack = blocks.filter(Boolean).join(' \n ').toLowerCase();
  const hits = new Set<string>();
  for (const word of BANNED_WORDS) {
    const pattern = new RegExp(`(^|[^a-z0-9])${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    if (pattern.test(haystack)) hits.add(word);
  }
  return [...hits];
}

export const PLATFORM_COMMISSION_PERCENT = 20;

export function splitAmount(total: number, commissionPercent = PLATFORM_COMMISSION_PERCENT) {
  const platform = Math.round(total * (commissionPercent / 100) * 100) / 100;
  const creator = Math.round((total - platform) * 100) / 100;
  return { platform_fee_amount: platform, creator_payout_amount: creator };
}

export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_REGEX = /^\d{9,18}$/;
