import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_ANON_KEY')!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const token = authHeader.replace('Bearer ', '');
    const { data: claimsData, error: claimsError } = await supabase.auth.getClaims(token);
    if (claimsError || !claimsData?.claims) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const { group_id, origin } = await req.json();
    if (!group_id || typeof group_id !== 'string') {
      return new Response(JSON.stringify({ error: 'group_id required' }), { status: 400, headers: corsHeaders });
    }

    // Server-side price + name lookup (never trust the client)
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    const { data: groupRow, error: grpErr } = await adminClient
      .from('groups')
      .select('id, name, monthly_price, is_active')
      .eq('id', group_id)
      .maybeSingle();
    if (grpErr || !groupRow || !groupRow.is_active) {
      return new Response(JSON.stringify({ error: 'Group not available' }), { status: 404, headers: corsHeaders });
    }
    const amount = Number(groupRow.monthly_price);
    if (!Number.isFinite(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Invalid group price' }), { status: 400, headers: corsHeaders });
    }
    const group_name = groupRow.name as string;

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');

    // Detect sandbox mode: missing keys OR obvious placeholder values.
    const isPlaceholder = (v?: string | null) =>
      !v || v.length < 12 || /test|sandbox|placeholder|fake|xxx|dummy|your_/i.test(v);
    const sandboxMode = isPlaceholder(RAZORPAY_KEY_ID) || isPlaceholder(RAZORPAY_KEY_SECRET);

    if (sandboxMode) {
      const fakePaymentId = `sandbox_${crypto.randomUUID()}`;
      const base = (origin || '').replace(/\/$/, '') || 'https://tradecircle.app';
      const link = `${base}/payment-success?group_id=${encodeURIComponent(group_id)}&payment_id=${fakePaymentId}&status=paid&sandbox=1`;
      return new Response(JSON.stringify({ payment_link: link, sandbox: true }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const razorpayRes = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: Math.round(amount * 100),
        currency: 'INR',
        description: `Subscription: ${group_name}`,
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/razorpay-webhook?group_id=${group_id}`,
        callback_method: 'get',
        notes: { group_id, group_name },
      }),
    });

    const razorpayData = await razorpayRes.json();
    if (!razorpayRes.ok) {
      console.error('Razorpay error:', razorpayData);
      return new Response(JSON.stringify({ error: 'Failed to create payment link', details: razorpayData }), { status: 500, headers: corsHeaders });
    }

    // adminClient was created above for price lookup; reuse it.

    await adminClient.from('groups').update({
      razorpay_payment_link: razorpayData.short_url,
    }).eq('id', group_id);

    return new Response(JSON.stringify({ payment_link: razorpayData.short_url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: (error as Error).message }), { status: 500, headers: corsHeaders });
  }
});
