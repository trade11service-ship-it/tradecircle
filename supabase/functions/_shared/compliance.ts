// Shared helpers for the SEBI pass-through compliance pipeline.
// Used by kyc-verify, advisor-checkout, payment-confirm and generate-compliance-pdf.

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

/* ------------------------------------------------------------------ */
/* Encryption (AES-256-GCM) — key lives only in backend secrets        */
/* ------------------------------------------------------------------ */

async function getKey(): Promise<CryptoKey> {
  const raw = Deno.env.get('PAN_ENCRYPTION_KEY');
  if (!raw) throw new Error('PAN_ENCRYPTION_KEY is not configured');
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(raw));
  return crypto.subtle.importKey('raw', digest, { name: 'AES-GCM' }, false, ['encrypt', 'decrypt']);
}

export async function encryptValue(plain: string): Promise<string> {
  const key = await getKey();
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const cipher = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(plain)),
  );
  const packed = new Uint8Array(iv.length + cipher.length);
  packed.set(iv, 0);
  packed.set(cipher, iv.length);
  return `v1:${btoa(String.fromCharCode(...packed))}`;
}

export async function decryptValue(payload: string): Promise<string> {
  if (!payload?.startsWith('v1:')) throw new Error('Unsupported ciphertext');
  const packed = Uint8Array.from(atob(payload.slice(3)), (c) => c.charCodeAt(0));
  const iv = packed.slice(0, 12);
  const cipher = packed.slice(12);
  const key = await getKey();
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv }, key, cipher);
  return new TextDecoder().decode(plain);
}

/* ------------------------------------------------------------------ */
/* Masking + validation                                                */
/* ------------------------------------------------------------------ */

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** ABCDE1234F -> XXXXX1234F */
export function maskPan(pan: string): string {
  const p = pan.toUpperCase();
  if (p.length !== 10) return 'XXXXXXXXXX';
  return `XXXXX${p.slice(5)}`;
}

/** rzp_live_abc123XYZ -> rzp_live_••••3XYZ */
export function maskSecret(value: string): string {
  if (!value) return '';
  return `••••${value.slice(-4)}`;
}

export function clientIp(req: Request): string {
  return (
    req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    req.headers.get('cf-connecting-ip') ||
    'unknown'
  );
}

/* ------------------------------------------------------------------ */
/* SEBI Most Important Terms & Conditions                              */
/* ------------------------------------------------------------------ */

export const MITC_VERSION = '2026-07-27';

export function buildMitc(opts: {
  advisorName: string;
  sebiRegNo: string;
  groupName: string;
  price: number;
  durationDays: number;
}): string[] {
  const { advisorName, sebiRegNo, groupName, price, durationDays } = opts;
  return [
    `1. PARTIES — This agreement is executed between the subscriber ("Client") and ${advisorName}, a Research Analyst registered with the Securities and Exchange Board of India under registration number ${sebiRegNo} ("RA").`,
    `2. SERVICE — The RA provides non-personalised research recommendations through the research package "${groupName}". The service does not constitute personalised investment advice, portfolio management, or any assurance of returns.`,
    `3. FEES — The Client pays ${'\u20B9'}${price} for a term of ${durationDays} days. Fees are collected directly by the RA. RA Circle (STREZONIC PRIVATE LIMITED, CIN U62099MH2025PTC453360) is a technology service provider only and is not a party to the advisory relationship, does not collect advisory fees, and earns no commission on this transaction.`,
    `4. NO GUARANTEED RETURNS — Research recommendations are opinions based on analysis. Securities markets are subject to market risk. Past performance is not indicative of future results. The RA does not guarantee any profit or protection against loss.`,
    `5. RISK DISCLOSURE — The Client confirms having read and understood the standard SEBI risk disclosure and accepts full responsibility for every trading and investment decision taken.`,
    `6. NO PERSONALISED ADVICE — As a Research Analyst, the RA publishes general research. The Client must independently assess suitability with respect to their own financial situation and objectives.`,
    `7. CONFLICT OF INTEREST — The RA discloses any material conflict of interest, including holdings in recommended securities, in accordance with SEBI (Research Analysts) Regulations, 2014.`,
    `8. TERMINATION & REFUNDS — The subscription runs for the stated term. Refund eligibility, if any, is governed by the RA's own refund policy. RA Circle does not process refunds on behalf of the RA.`,
    `9. GRIEVANCE REDRESSAL — Complaints must first be raised with the RA. Unresolved complaints may be escalated to SEBI SCORES (scores.sebi.gov.in) and thereafter to the Online Dispute Resolution portal (smartodr.in).`,
    `10. DATA PROTECTION — Identity details are processed under the Digital Personal Data Protection Act, 2023 solely for regulatory compliance. Identity numbers are stored encrypted and are never displayed in unmasked form on any dashboard.`,
    `11. RECORD RETENTION — A hardened copy of this agreement, including identity, consent metadata and payment reference, is retained for five years to satisfy SEBI audit requirements.`,
  ];
}
