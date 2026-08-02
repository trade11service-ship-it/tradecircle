// Shared Digio adapter for identity + bank verification.
//
// PRIVACY: this module NEVER returns or logs the raw vendor payload.
// Callers receive only { ok, reason, transaction_id, verdict, timestamp }.
// Raw PAN / account numbers are used in-flight only and encrypted by callers.

export const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;
export const IFSC_REGEX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
export const ACCOUNT_REGEX = /^\d{9,18}$/;

export type KycVerdict = {
  ok: boolean;
  reason?: string;
  /** Vendor transaction reference — safe to persist (no PII). */
  transaction_id: string;
  /** Coarse verdict string for audit logs. */
  verdict: 'verified' | 'failed';
  timestamp: string;
  /** Only set by pennyDrop — payout vendor handle. */
  vendor_id?: string;
};

function stamp(): string {
  return new Date().toISOString();
}

function provider(): 'sandbox' | 'digio' {
  return (Deno.env.get('KYC_PROVIDER') ?? 'sandbox') === 'digio' ? 'digio' : 'sandbox';
}

async function digioFetch(path: string, body: Record<string, unknown>) {
  const base = Deno.env.get('DIGIO_BASE_URL');
  const id = Deno.env.get('DIGIO_CLIENT_ID');
  const secret = Deno.env.get('DIGIO_CLIENT_SECRET');
  if (!base || !id || !secret) throw new Error('Digio credentials are not configured');

  const res = await fetch(`${base.replace(/\/$/, '')}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Basic ${btoa(`${id}:${secret}`)}`,
    },
    body: JSON.stringify(body),
  });
  const payload = await res.json().catch(() => ({}));
  // Deliberately not logging `payload` — it can contain third-party PII.
  return { status: res.status, ok: res.ok, payload } as {
    status: number;
    ok: boolean;
    payload: Record<string, any>;
  };
}

/* ------------------------------------------------------------------ */
/* PAN verification                                                    */
/* ------------------------------------------------------------------ */

export async function verifyPan(pan: string, name: string): Promise<KycVerdict> {
  const timestamp = stamp();
  const p = pan.toUpperCase().trim();

  if (!PAN_REGEX.test(p)) {
    return { ok: false, reason: 'PAN format is invalid. Expected ABCDE1234F.', transaction_id: '', verdict: 'failed', timestamp };
  }
  if (name.trim().length < 3) {
    return { ok: false, reason: 'Legal name is too short to match PAN records.', transaction_id: '', verdict: 'failed', timestamp };
  }

  if (provider() === 'sandbox') {
    return { ok: true, transaction_id: `sbx_pan_${crypto.randomUUID().slice(0, 12)}`, verdict: 'verified', timestamp };
  }

  const { ok, payload } = await digioFetch('/v3/client/kyc/fetch_id_data/PAN', {
    id_no: p,
    name: name.trim(),
  });
  const txn = String(payload?.id ?? payload?.transaction_id ?? '');
  const matched = ok && (payload?.status === 'success' || payload?.valid === true || payload?.id_verified === true);

  return matched
    ? { ok: true, transaction_id: txn, verdict: 'verified', timestamp: stamp() }
    : {
        ok: false,
        reason: 'PAN could not be verified. Check the number and the name exactly as printed on the card.',
        transaction_id: txn,
        verdict: 'failed',
        timestamp: stamp(),
      };
}

/* ------------------------------------------------------------------ */
/* Bank penny drop                                                     */
/* ------------------------------------------------------------------ */

export async function pennyDrop(account: string, ifsc: string, holder: string): Promise<KycVerdict> {
  const timestamp = stamp();
  const acc = account.replace(/\s/g, '');
  const code = ifsc.toUpperCase().replace(/\s/g, '');

  if (!ACCOUNT_REGEX.test(acc)) {
    return { ok: false, reason: 'Bank account number must be 9-18 digits.', transaction_id: '', verdict: 'failed', timestamp };
  }
  if (!IFSC_REGEX.test(code)) {
    return { ok: false, reason: 'IFSC code is invalid. Expected HDFC0001234.', transaction_id: '', verdict: 'failed', timestamp };
  }
  if (holder.trim().length < 3) {
    return { ok: false, reason: 'Account holder name is required.', transaction_id: '', verdict: 'failed', timestamp };
  }

  if (provider() === 'sandbox') {
    const id = `sbx_bank_${crypto.randomUUID().slice(0, 12)}`;
    return { ok: true, transaction_id: id, vendor_id: id, verdict: 'verified', timestamp };
  }

  const { ok, payload } = await digioFetch('/v3/client/verify/bank_account', {
    beneficiary_account_no: acc,
    beneficiary_ifsc: code,
    beneficiary_name: holder.trim(),
  });
  const txn = String(payload?.id ?? payload?.transaction_id ?? '');
  const verified = ok && (payload?.status === 'success' || payload?.account_exists === true);

  return verified
    ? { ok: true, transaction_id: txn, vendor_id: txn, verdict: 'verified', timestamp: stamp() }
    : {
        ok: false,
        reason: 'Bank account verification failed. Confirm the account number, IFSC and holder name.',
        transaction_id: txn,
        verdict: 'failed',
        timestamp: stamp(),
      };
}
