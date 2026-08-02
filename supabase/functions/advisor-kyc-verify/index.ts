import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, encryptValue, maskPan, clientIp } from '../_shared/compliance.ts';
import { verifyPan, pennyDrop } from '../_shared/digio.ts';

/**
 * Deferred SEBI advisor KYC.
 *
 * Runs only for advisors the admin has already pre-approved after a manual,
 * offline SEBI registration check. Success flips the advisor to `approved`,
 * which is what the RLS policy on group creation checks.
 *
 * PRIVACY: raw PAN and account numbers are encrypted before storage; only
 * transaction_id + verdict + timestamp are written to kyc_audit_events.
 */

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const pan = String(body.pan ?? '').toUpperCase().trim();
    const legalName = String(body.full_legal_name ?? '').trim();
    const account = String(body.bank_account_number ?? '').replace(/\s/g, '');
    const ifsc = String(body.bank_ifsc ?? '').toUpperCase().replace(/\s/g, '');
    const holder = String(body.bank_account_holder_name ?? '').trim();

    if (!pan || !legalName || !account || !ifsc || !holder) {
      return json({ error: 'Legal name, PAN and full bank details are required.' }, 400);
    }

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: advisor } = await admin
      .from('advisors')
      .select('id, status, kyc_status')
      .eq('user_id', userId)
      .maybeSingle();

    if (!advisor) return json({ error: 'No advisor record found for this account.' }, 404);
    if (advisor.kyc_status === 'approved') return json({ error: 'Your KYC is already verified.' }, 400);
    if (advisor.status !== 'pre_approved' && advisor.status !== 'approved') {
      return json({ error: 'Your SEBI registration is still under manual review.' }, 403);
    }

    const provider = Deno.env.get('KYC_PROVIDER') ?? 'sandbox';
    await admin.from('advisors').update({ kyc_status: 'pending', kyc_updated_at: new Date().toISOString() }).eq('id', advisor.id);

    const logEvent = async (check: string, v: { transaction_id: string; verdict: string }) => {
      await admin.from('kyc_audit_events').insert({
        subject_type: 'advisor',
        subject_id: advisor.id,
        check_type: check,
        provider,
        transaction_id: v.transaction_id || null,
        status_verdict: v.verdict,
      });
    };

    const panResult = await verifyPan(pan, legalName);
    await logEvent('pan', panResult);
    if (!panResult.ok) {
      await admin
        .from('advisors')
        .update({ kyc_status: 'rejected', kyc_rejection_reason: panResult.reason, kyc_updated_at: new Date().toISOString() })
        .eq('id', advisor.id);
      return json({ kyc_status: 'rejected', error: panResult.reason }, 400);
    }

    const bankResult = await pennyDrop(account, ifsc, holder);
    await logEvent('bank_penny_drop', bankResult);
    if (!bankResult.ok) {
      await admin
        .from('advisors')
        .update({ kyc_status: 'rejected', kyc_rejection_reason: bankResult.reason, kyc_updated_at: new Date().toISOString() })
        .eq('id', advisor.id);
      return json({ kyc_status: 'rejected', error: bankResult.reason }, 400);
    }

    const { error } = await admin
      .from('advisors')
      .update({
        full_name: legalName,
        pan_masked: maskPan(pan),
        encrypted_pan: await encryptValue(pan),
        bank_account_number: await encryptValue(account),
        bank_ifsc: ifsc,
        bank_account_holder_name: holder,
        payout_vendor_id: bankResult.vendor_id ?? null,
        kyc_status: 'approved',
        kyc_rejection_reason: null,
        kyc_updated_at: new Date().toISOString(),
        status: 'approved',
      })
      .eq('id', advisor.id);
    if (error) throw error;

    console.log('advisor-kyc-verify approved', { advisor_id: advisor.id, ip: clientIp(req) });

    return json({ kyc_status: 'approved', status: 'approved', pan_masked: maskPan(pan) });
  } catch (error) {
    console.error('advisor-kyc-verify failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
