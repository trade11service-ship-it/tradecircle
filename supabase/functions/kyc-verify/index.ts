import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import {
  corsHeaders,
  json,
  encryptValue,
  maskPan,
  PAN_REGEX,
  clientIp,
} from '../_shared/compliance.ts';

/**
 * Pass-through KYC.
 * Raw PAN/DOB are received here, verified against a provider adapter and
 * immediately encrypted. The plaintext PAN never leaves this function and is
 * never written to a readable column.
 */

type KycResult = {
  verified: boolean;
  kra_status: string;
  reference_id: string;
  reason?: string;
};

/** Sandbox adapter — swap this file's implementation for Digio/Cashfree later. */
async function verifySandbox(pan: string, dob: string): Promise<KycResult> {
  if (!PAN_REGEX.test(pan)) {
    return { verified: false, kra_status: 'INVALID_FORMAT', reference_id: '', reason: 'PAN format is invalid. Expected ABCDE1234F.' };
  }
  const d = new Date(dob);
  if (isNaN(d.getTime())) {
    return { verified: false, kra_status: 'INVALID_DOB', reference_id: '', reason: 'Date of birth is invalid.' };
  }
  const age = (Date.now() - d.getTime()) / (365.25 * 24 * 3600 * 1000);
  if (age < 18 || age > 100) {
    return { verified: false, kra_status: 'INVALID_DOB', reference_id: '', reason: 'Subscriber must be at least 18 years old.' };
  }
  return { verified: true, kra_status: 'KRA_VERIFIED', reference_id: `sbx_${crypto.randomUUID()}` };
}

async function runKyc(pan: string, dob: string): Promise<KycResult> {
  const provider = Deno.env.get('KYC_PROVIDER') ?? 'sandbox';
  switch (provider) {
    // case 'digio': return verifyDigio(pan, dob);
    // case 'cashfree': return verifyCashfree(pan, dob);
    default:
      return verifySandbox(pan, dob);
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(
      authHeader.replace('Bearer ', ''),
    );
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;
    const userEmail = (claimsData.claims.email as string) ?? null;

    const body = await req.json().catch(() => ({}));
    const groupId: string | undefined = body.group_id;
    const pan: string = String(body.pan ?? '').toUpperCase().trim();
    const dob: string = String(body.dob ?? '').trim();

    if (!groupId) return json({ error: 'group_id is required' }, 400);
    if (!pan || !dob) return json({ error: 'PAN and date of birth are required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: group } = await admin
      .from('groups')
      .select('id, advisor_id, is_active')
      .eq('id', groupId)
      .maybeSingle();
    if (!group || !group.is_active) return json({ error: 'Group not found' }, 404);

    const result = await runKyc(pan, dob);
    if (!result.verified) {
      return json({ error: result.reason ?? 'Verification failed', kra_status: result.kra_status }, 400);
    }

    const encrypted = await encryptValue(pan);
    const masked = maskPan(pan);

    // Reuse a pending onboarding row for this user + group if one exists.
    const { data: existing } = await admin
      .from('client_onboarding')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', groupId)
      .eq('payment_status', 'pending')
      .order('created_at', { ascending: false })
      .maybeSingle();

    const payload = {
      user_id: userId,
      group_id: groupId,
      advisor_id: group.advisor_id,
      kyc_verified: true,
      kra_status: result.kra_status,
      kyc_reference_id: result.reference_id,
      pan_masked: masked,
      encrypted_pan: encrypted,
    };

    let onboardingId: string;
    if (existing) {
      onboardingId = existing.id;
      const { error } = await admin.from('client_onboarding').update(payload).eq('id', existing.id);
      if (error) throw error;
    } else {
      const { data: inserted, error } = await admin
        .from('client_onboarding')
        .insert(payload)
        .select('id')
        .single();
      if (error) throw error;
      onboardingId = inserted.id;
    }

    await admin.from('compliance_logs').insert({
      onboarding_id: onboardingId,
      ra_id: group.advisor_id,
      user_id: userId,
      client_email: userEmail,
      event_type: 'KYC_VERIFIED',
      metadata_json: {
        kra_status: result.kra_status,
        reference_id: result.reference_id,
        pan_masked: masked,
        ip: clientIp(req),
        user_agent: req.headers.get('user-agent') ?? '',
      },
    });

    return json({
      onboarding_id: onboardingId,
      pan_masked: masked,
      kra_status: result.kra_status,
      kyc_reference_id: result.reference_id,
    });
  } catch (error) {
    console.error('kyc-verify failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
