import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Sandbox-only: creates a subscription row when Razorpay is NOT configured.
// In live mode, subscription rows are created exclusively by razorpay-webhook
// using the service role (client INSERT is blocked by RLS).
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    const isPlaceholder = (v?: string | null) =>
      !v || v.length < 12 || /test|sandbox|placeholder|fake|xxx|dummy|your_/i.test(v);
    const sandboxMode = isPlaceholder(RAZORPAY_KEY_ID) || isPlaceholder(RAZORPAY_KEY_SECRET);
    if (!sandboxMode) {
      return new Response(JSON.stringify({ error: 'Sandbox confirmation is disabled in live mode' }), { status: 403, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonClient = createClient(supabaseUrl, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsErr } = await anonClient.auth.getClaims(token);
    const userId = claimsData?.claims?.sub as string | undefined;
    if (claimsErr || !userId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const body = await req.json();
    const group_id = String(body.group_id || '');
    const payment_id = String(body.payment_id || '');
    const pan_number = body.pan_number ? String(body.pan_number) : null;
    const consent_given = !!body.consent_given;
    const consent_timestamp = body.consent_timestamp ? String(body.consent_timestamp) : new Date().toISOString();
    if (!group_id || !payment_id.startsWith('sandbox_')) {
      return new Response(JSON.stringify({ error: 'Invalid sandbox payment' }), { status: 400, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    // Server-side price + advisor_id lookup
    const { data: group } = await admin
      .from('groups')
      .select('id, advisor_id, monthly_price, is_active')
      .eq('id', group_id)
      .maybeSingle();
    if (!group || !group.is_active) {
      return new Response(JSON.stringify({ error: 'Group not available' }), { status: 404, headers: corsHeaders });
    }

    // Idempotency by payment_id
    const { data: existing } = await admin
      .from('subscriptions').select('id').eq('razorpay_payment_id', payment_id).maybeSingle();
    if (existing) {
      return new Response(JSON.stringify({ ok: true, id: existing.id, dedup: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Skip if already active
    const { data: active } = await admin
      .from('subscriptions').select('id')
      .eq('user_id', userId).eq('group_id', group_id).eq('status', 'active')
      .gte('end_date', new Date().toISOString()).maybeSingle();
    if (active) {
      return new Response(JSON.stringify({ ok: true, id: active.id, already_active: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const end = new Date();
    end.setDate(end.getDate() + 30);

    const { data: inserted, error: insErr } = await admin.from('subscriptions').insert({
      user_id: userId,
      group_id,
      advisor_id: group.advisor_id,
      end_date: end.toISOString(),
      amount_paid: group.monthly_price,
      status: 'active',
      razorpay_payment_id: payment_id,
      pan_number,
      consent_given,
      consent_timestamp,
      consent_ip: req.headers.get('x-forwarded-for') || null,
    }).select('id').single();

    if (insErr) {
      return new Response(JSON.stringify({ error: insErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, id: inserted?.id, sandbox: true }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
