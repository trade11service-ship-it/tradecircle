import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, decryptValue } from '../_shared/compliance.ts';

/**
 * Merchant-keys mode: creates a Razorpay order using the ADVISOR's own
 * credentials. The advisor's key secret is decrypted in memory only and never
 * returned to the browser.
 */
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

    const { onboarding_id } = await req.json().catch(() => ({}));
    if (!onboarding_id) return json({ error: 'onboarding_id is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: onboarding } = await admin
      .from('client_onboarding')
      .select('id, user_id, group_id, consent_given, kyc_verified, payment_status')
      .eq('id', onboarding_id)
      .maybeSingle();

    if (!onboarding || onboarding.user_id !== userId) return json({ error: 'Onboarding not found' }, 404);
    if (!onboarding.kyc_verified || !onboarding.consent_given) {
      return json({ error: 'Complete verification and consent before payment' }, 400);
    }
    if (onboarding.payment_status === 'captured') return json({ error: 'Already paid' }, 400);

    const { data: group } = await admin
      .from('groups')
      .select('id, name, monthly_price, payment_mode')
      .eq('id', onboarding.group_id)
      .maybeSingle();

    if (!group) return json({ error: 'Group not found' }, 404);

    // Credentials live in a service-role-only table (never broadcast or exposed).
    const { data: creds } = await admin
      .from('group_payment_credentials')
      .select('advisor_payment_url, advisor_merchant_key_id, advisor_merchant_key_secret')
      .eq('group_id', group.id)
      .maybeSingle();

    // Hosted payment-link mode: the URL is never exposed through the Data API,
    // so it is handed out here only to the verified owner of this onboarding.
    if (group.payment_mode !== 'merchant_keys') {
      if (!creds?.advisor_payment_url) {
        return json({ error: 'This analyst has not published a payment link yet' }, 400);
      }
      return json({ payment_url: creds.advisor_payment_url, group_name: group.name });
    }

    if (!creds?.advisor_merchant_key_id || !creds?.advisor_merchant_key_secret) {
      return json({ error: 'This analyst has not configured in-app checkout' }, 400);
    }

    const keyId = creds.advisor_merchant_key_id;
    const keySecret = await decryptValue(creds.advisor_merchant_key_secret);

    const orderRes = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Basic ' + btoa(`${keyId}:${keySecret}`),
      },
      body: JSON.stringify({
        amount: Math.round(Number(group.monthly_price) * 100),
        currency: 'INR',
        receipt: onboarding_id,
        notes: { onboarding_id, group_id: group.id, group_name: group.name },
      }),
    });

    const order = await orderRes.json();
    if (!orderRes.ok) {
      console.error('Advisor gateway order failed:', orderRes.status, JSON.stringify(order));
      return json(
        { error: 'The analyst payment gateway rejected this order', details: order?.error?.description ?? null },
        orderRes.status,
      );
    }

    return json({
      key_id: keyId,
      order_id: order.id,
      amount: order.amount,
      currency: order.currency,
      group_name: group.name,
    });
  } catch (error) {
    console.error('advisor-checkout failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
