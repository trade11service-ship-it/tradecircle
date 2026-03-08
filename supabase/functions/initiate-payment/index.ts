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

    const userId = claimsData.claims.sub;
    const { group_id } = await req.json();

    // Get group info
    const { data: group } = await supabase.from('groups').select('*').eq('id', group_id).single();
    if (!group) {
      return new Response(JSON.stringify({ error: 'Group not found' }), { status: 404, headers: corsHeaders });
    }

    // Check if already subscribed
    const { data: existing } = await supabase.from('subscriptions')
      .select('id')
      .eq('user_id', userId)
      .eq('group_id', group_id)
      .eq('status', 'active')
      .maybeSingle();

    if (existing) {
      return new Response(JSON.stringify({ error: 'Already subscribed' }), { status: 400, headers: corsHeaders });
    }

    // Get user profile for prefill
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', userId).single();

    const RAZORPAY_KEY_ID = Deno.env.get('RAZORPAY_KEY_ID');
    const RAZORPAY_KEY_SECRET = Deno.env.get('RAZORPAY_KEY_SECRET');
    if (!RAZORPAY_KEY_ID || !RAZORPAY_KEY_SECRET) {
      return new Response(JSON.stringify({ error: 'Payment system not configured' }), { status: 500, headers: corsHeaders });
    }

    // Create a unique payment link for this user + group
    const razorpayRes = await fetch('https://api.razorpay.com/v1/payment_links', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Basic ' + btoa(`${RAZORPAY_KEY_ID}:${RAZORPAY_KEY_SECRET}`),
      },
      body: JSON.stringify({
        amount: group.monthly_price * 100,
        currency: 'INR',
        description: `Subscription: ${group.name}`,
        customer: {
          name: profile?.full_name || '',
          email: profile?.email || '',
          contact: profile?.phone || '',
        },
        notify: { sms: true, email: true },
        callback_url: `${Deno.env.get('SUPABASE_URL')}/functions/v1/razorpay-webhook?group_id=${group_id}`,
        callback_method: 'get',
        notes: {
          group_id: group_id,
          user_id: userId,
          group_name: group.name,
        },
        expire_by: Math.floor(Date.now() / 1000) + 3600, // 1 hour expiry
      }),
    });

    const razorpayData = await razorpayRes.json();
    if (!razorpayRes.ok) {
      console.error('Razorpay error:', razorpayData);
      return new Response(JSON.stringify({ error: 'Failed to create payment link' }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ payment_url: razorpayData.short_url }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
