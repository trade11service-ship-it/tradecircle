import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, decryptValue } from '../_shared/compliance.ts';

/**
 * Confirms an analyst-collected payment.
 *  - merchant_keys mode: verifies the gateway signature with the advisor's secret.
 *  - payment_link mode: accepts a client-supplied payment reference / UTR.
 * On success it activates the subscription and kicks off the compliance PDF.
 */

async function hmacHex(secret: string, message: string): Promise<string> {
  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const sig = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(message));
  return Array.from(new Uint8Array(sig))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
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
    const onboardingId: string | undefined = body.onboarding_id;
    const txnId: string = String(body.txn_id ?? body.razorpay_payment_id ?? '').trim();
    const orderId: string = String(body.razorpay_order_id ?? '').trim();
    const signature: string = String(body.razorpay_signature ?? '').trim();

    if (!onboardingId) return json({ error: 'onboarding_id is required' }, 400);
    if (!txnId) return json({ error: 'A payment reference is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: onboarding } = await admin
      .from('client_onboarding')
      .select('id, user_id, group_id, advisor_id, consent_given, kyc_verified, payment_status')
      .eq('id', onboardingId)
      .maybeSingle();

    if (!onboarding || onboarding.user_id !== userId) return json({ error: 'Onboarding not found' }, 404);
    if (!onboarding.kyc_verified || !onboarding.consent_given) {
      return json({ error: 'Verification and consent must be completed first' }, 400);
    }

    const { data: group } = await admin
      .from('groups')
      .select('id, name, monthly_price, duration_days, advisor_id, payment_mode, advisor_merchant_key_secret')
      .eq('id', onboarding.group_id)
      .maybeSingle();
    if (!group) return json({ error: 'Group not found' }, 404);

    // Signature verification for in-app checkout.
    if (group.payment_mode === 'merchant_keys') {
      if (!orderId || !signature) return json({ error: 'Missing payment signature' }, 400);
      if (!group.advisor_merchant_key_secret) return json({ error: 'Analyst gateway not configured' }, 400);
      const secret = await decryptValue(group.advisor_merchant_key_secret);
      const expected = await hmacHex(secret, `${orderId}|${txnId}`);
      if (expected !== signature) {
        await admin.from('compliance_logs').insert({
          onboarding_id: onboardingId,
          ra_id: onboarding.advisor_id,
          user_id: userId,
          client_email: userEmail,
          event_type: 'PAYMENT_FAILED',
          metadata_json: { reason: 'signature_mismatch', order_id: orderId },
        });
        return json({ error: 'Payment signature could not be verified' }, 400);
      }
    }

    // Reject a reference already used by another onboarding record.
    const { data: clash } = await admin
      .from('client_onboarding')
      .select('id')
      .eq('payment_reference_id', txnId)
      .neq('id', onboardingId)
      .maybeSingle();
    if (clash) return json({ error: 'This payment reference has already been used' }, 400);

    const now = new Date();
    const durationDays = Number(group.duration_days ?? 30);
    const endDate = new Date(now.getTime() + durationDays * 24 * 60 * 60 * 1000);

    if (onboarding.payment_status !== 'captured') {
      const { error: updErr } = await admin
        .from('client_onboarding')
        .update({ payment_status: 'captured', payment_reference_id: txnId })
        .eq('id', onboardingId);
      if (updErr) throw updErr;
    }

    // Activate (or reuse) the subscription.
    const { data: existingSub } = await admin
      .from('subscriptions')
      .select('id')
      .eq('onboarding_id', onboardingId)
      .maybeSingle();

    let subscriptionId = existingSub?.id ?? null;
    if (!subscriptionId) {
      const { data: sub, error: subErr } = await admin
        .from('subscriptions')
        .insert({
          user_id: userId,
          group_id: group.id,
          advisor_id: group.advisor_id,
          onboarding_id: onboardingId,
          status: 'active',
          start_date: now.toISOString(),
          end_date: endDate.toISOString(),
          amount_paid: Math.round(Number(group.monthly_price)),
          razorpay_payment_id: txnId,
          consent_given: true,
        })
        .select('id')
        .single();
      if (subErr) throw subErr;
      subscriptionId = sub.id;
    }

    await admin.from('compliance_logs').insert({
      onboarding_id: onboardingId,
      ra_id: onboarding.advisor_id,
      user_id: userId,
      client_email: userEmail,
      event_type: 'PAYMENT_CAPTURED',
      metadata_json: {
        payment_reference: txnId,
        mode: group.payment_mode,
        amount: group.monthly_price,
        subscription_id: subscriptionId,
      },
    });

    // Fire the vault pipeline (non-blocking for the client experience).
    try {
      await admin.functions.invoke('generate-compliance-pdf', {
        body: { onboarding_id: onboardingId },
      });
    } catch (e) {
      console.error('PDF pipeline trigger failed:', e);
    }

    return json({
      ok: true,
      subscription_id: subscriptionId,
      group_id: group.id,
      group_name: group.name,
      end_date: endDate.toISOString(),
    });
  } catch (error) {
    console.error('payment-confirm failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
