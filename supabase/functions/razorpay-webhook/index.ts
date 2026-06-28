import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-razorpay-signature',
};

async function verifyRazorpaySignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
  try {
    const enc = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    );
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody));
    const hex = Array.from(new Uint8Array(sigBuf)).map(b => b.toString(16).padStart(2, '0')).join('');
    // constant-time compare
    if (hex.length !== signature.length) return false;
    let diff = 0;
    for (let i = 0; i < hex.length; i++) diff |= hex.charCodeAt(i) ^ signature.charCodeAt(i);
    return diff === 0;
  } catch (e) {
    console.error('Signature verify error:', e);
    return false;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle POST webhook from Razorpay
    if (req.method === 'POST') {
      const rawBody = await req.text();
      const signature = req.headers.get('x-razorpay-signature') || '';
      const webhookSecret = Deno.env.get('RAZORPAY_WEBHOOK_SECRET');

      // Enforce signature when secret is configured. If missing, we still process but log loudly
      // so the operator notices (production must set RAZORPAY_WEBHOOK_SECRET).
      if (webhookSecret) {
        const ok = await verifyRazorpaySignature(rawBody, signature, webhookSecret);
        if (!ok) {
          console.error('Razorpay webhook signature verification FAILED');
          return new Response(JSON.stringify({ error: 'invalid_signature' }), { status: 401, headers: corsHeaders });
        }
      } else {
        console.warn('RAZORPAY_WEBHOOK_SECRET not configured — webhook is accepting unverified requests');
      }

      const body = JSON.parse(rawBody);
      const event = body.event;

      if (event === 'payment_link.paid') {
        const paymentLink = body.payload.payment_link.entity;
        const payment = body.payload.payment.entity;
        const groupId = paymentLink.notes?.group_id;
        const userId = paymentLink.notes?.user_id;

        if (!groupId || !userId) {
          console.error('Missing group_id or user_id in payment notes');
          return new Response(JSON.stringify({ status: 'missing_data' }), { status: 200, headers: corsHeaders });
        }

        const { data: group } = await adminClient.from('groups').select('*').eq('id', groupId).single();
        if (!group) {
          return new Response(JSON.stringify({ status: 'group_not_found' }), { status: 200, headers: corsHeaders });
        }

        // Idempotency: dedupe by razorpay_payment_id first, then by user+group.
        const { data: byPayment } = await adminClient.from('subscriptions')
          .select('id').eq('razorpay_payment_id', payment.id).maybeSingle();
        if (byPayment) {
          return new Response(JSON.stringify({ status: 'already_recorded' }), { status: 200, headers: corsHeaders });
        }

        const { data: existing } = await adminClient.from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ status: 'already_subscribed' }), { status: 200, headers: corsHeaders });
        }

        // Referral lookup (server-side, can't trust client cookie)
        let fromReferral = false;
        let referralCode: string | null = null;
        let platformFee = 30;
        const { data: refSignup } = await adminClient.from('referral_signups')
          .select('referral_code, signed_up_at, is_referral_active')
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .eq('is_referral_active', true)
          .maybeSingle();
        if (refSignup) {
          const days = (Date.now() - new Date(refSignup.signed_up_at).getTime()) / (1000 * 60 * 60 * 24);
          if (days <= 30) {
            fromReferral = true;
            referralCode = refSignup.referral_code;
            platformFee = 15;
          }
        }

        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        const { error: insErr } = await adminClient.from('subscriptions').insert({
          user_id: userId,
          group_id: groupId,
          advisor_id: group.advisor_id,
          end_date: endDate.toISOString(),
          amount_paid: group.monthly_price,
          status: 'active',
          razorpay_payment_id: payment.id,
          from_referral: fromReferral,
          referral_code: referralCode,
          platform_fee_percent: platformFee,
        });

        if (insErr) {
          console.error('Subscription insert failed:', insErr);
          return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
        }

        // Real-time archive snapshot — immutable financial compliance record.
        try {
          const { data: subRow } = await adminClient.from('subscriptions')
            .select('id, pan_number, consent_timestamp, consent_ip')
            .eq('razorpay_payment_id', payment.id).maybeSingle();
          const { data: profile } = await adminClient.from('profiles')
            .select('full_name, email, phone').eq('id', userId).maybeSingle();
          await adminClient.from('financial_compliance_archive').insert({
            user_id: userId,
            subscription_id: subRow?.id ?? null,
            full_name: profile?.full_name ?? null,
            email: profile?.email ?? null,
            phone: (profile as any)?.phone ?? null,
            pan_number: subRow?.pan_number ?? paymentLink.notes?.pan_number ?? null,
            amount_paid: group.monthly_price,
            razorpay_payment_id: payment.id,
            consent_timestamp: subRow?.consent_timestamp ?? new Date().toISOString(),
            consent_ip: subRow?.consent_ip ?? null,
          });
        } catch (archiveErr) {
          console.error('Archive insert failed (non-fatal):', archiveErr);
        }

        if (fromReferral && referralCode) {
          try {
            await adminClient.rpc('increment_referral_conversions', { _code: referralCode, _revenue: group.monthly_price });
            await adminClient.from('referral_signups')
              .update({ converted_to_paid: true })
              .eq('user_id', userId).eq('group_id', groupId);
          } catch (e) { console.error('Referral tracking:', e); }
        }

        return new Response(JSON.stringify({ status: 'subscription_created' }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ status: 'ignored', event }), { status: 200, headers: corsHeaders });
    }

    // Handle GET callback redirect from Razorpay payment link (back-compat — frontend handles success now)
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const groupId = url.searchParams.get('group_id');
      const paymentId = url.searchParams.get('razorpay_payment_id') || url.searchParams.get('razorpay_payment_link_id');
      const status = url.searchParams.get('razorpay_payment_link_status');
      const frontendUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
      const redirectUrl = `${frontendUrl}/payment-success?group_id=${groupId}&payment_id=${paymentId}&status=${status}`;
      return new Response(null, { status: 302, headers: { ...corsHeaders, 'Location': redirectUrl } });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
