import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, encryptValue, maskPan, PAN_REGEX, clientIp } from '../_shared/compliance.ts';
import { IFSC_REGEX, ACCOUNT_REGEX } from '../_shared/courses.ts';

/**
 * Creator payout KYC — PAN validation + bank penny drop.
 *
 * DATA ISOLATION: results are written ONLY to public.creator_profiles.
 * This function must never touch compliance_logs, client_onboarding,
 * the compliance-vault bucket, or generate-compliance-pdf.
 */

type Verdict = { ok: boolean; reason?: string; vendor_id?: string };

/** Sandbox adapter — swap for Cashfree/Digio when live keys land. */
async function verifyPanSandbox(pan: string, name: string): Promise<Verdict> {
  if (!PAN_REGEX.test(pan)) return { ok: false, reason: 'PAN format is invalid. Expected ABCDE1234F.' };
  if (name.trim().length < 3) return { ok: false, reason: 'Legal name is too short to match PAN records.' };
  return { ok: true };
}

async function pennyDropSandbox(account: string, ifsc: string, holder: string): Promise<Verdict> {
  if (!ACCOUNT_REGEX.test(account)) return { ok: false, reason: 'Bank account number must be 9-18 digits.' };
  if (!IFSC_REGEX.test(ifsc)) return { ok: false, reason: 'IFSC code is invalid. Expected HDFC0001234.' };
  if (holder.trim().length < 3) return { ok: false, reason: 'Account holder name is required.' };
  return { ok: true, vendor_id: `vnd_sbx_${crypto.randomUUID().slice(0, 12)}` };
}

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

    const { data: creator } = await admin
      .from('creator_profiles')
      .select('id, kyc_status')
      .eq('user_id', userId)
      .maybeSingle();
    if (!creator) return json({ error: 'Create your creator profile first.' }, 404);
    if (creator.kyc_status === 'approved') return json({ error: 'Payout details are already verified.' }, 400);

    // Gate: KYC only unlocks once at least one course has cleared admin review.
    const { count: approvedCourses } = await admin
      .from('courses')
      .select('id', { count: 'exact', head: true })
      .eq('creator_id', creator.id)
      .eq('review_status', 'approved');
    if (!approvedCourses) {
      return json({ error: 'Payout verification unlocks after an admin approves one of your courses.' }, 403);
    }

    await admin.from('creator_profiles').update({ kyc_status: 'pending' }).eq('id', creator.id);

    const panResult = await verifyPanSandbox(pan, legalName);
    if (!panResult.ok) {
      await admin
        .from('creator_profiles')
        .update({ kyc_status: 'rejected', rejection_reason: panResult.reason })
        .eq('id', creator.id);
      return json({ error: panResult.reason }, 400);
    }

    const bankResult = await pennyDropSandbox(account, ifsc, holder);
    if (!bankResult.ok) {
      await admin
        .from('creator_profiles')
        .update({ kyc_status: 'rejected', rejection_reason: bankResult.reason })
        .eq('id', creator.id);
      return json({ error: bankResult.reason }, 400);
    }

    const { error } = await admin
      .from('creator_profiles')
      .update({
        full_legal_name: legalName,
        pan_masked: maskPan(pan),
        encrypted_pan: await encryptValue(pan),
        bank_account_number: await encryptValue(account),
        bank_ifsc: ifsc,
        bank_account_holder_name: holder,
        payout_vendor_id: bankResult.vendor_id,
        kyc_status: 'approved',
        rejection_reason: null,
      })
      .eq('id', creator.id);
    if (error) throw error;

    console.log('creator-kyc-verify approved', { creator_id: creator.id, ip: clientIp(req) });

    return json({
      kyc_status: 'approved',
      pan_masked: maskPan(pan),
      payout_vendor_id: bankResult.vendor_id,
    });
  } catch (error) {
    console.error('creator-kyc-verify failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
