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
    const adminClient = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Handle POST webhook from Razorpay
    if (req.method === 'POST') {
      const body = await req.json();
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

        // Get group details
        const { data: group } = await adminClient.from('groups').select('*').eq('id', groupId).single();
        if (!group) {
          return new Response(JSON.stringify({ status: 'group_not_found' }), { status: 200, headers: corsHeaders });
        }

        // Check if subscription already exists
        const { data: existing } = await adminClient.from('subscriptions')
          .select('id')
          .eq('user_id', userId)
          .eq('group_id', groupId)
          .eq('status', 'active')
          .maybeSingle();

        if (existing) {
          return new Response(JSON.stringify({ status: 'already_subscribed' }), { status: 200, headers: corsHeaders });
        }

        // Create subscription
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + 30);

        await adminClient.from('subscriptions').insert({
          user_id: userId,
          group_id: groupId,
          advisor_id: group.advisor_id,
          end_date: endDate.toISOString(),
          amount_paid: group.monthly_price,
          status: 'active',
          razorpay_payment_id: payment.id,
        });

        return new Response(JSON.stringify({ status: 'subscription_created' }), { status: 200, headers: corsHeaders });
      }

      return new Response(JSON.stringify({ status: 'ignored' }), { status: 200, headers: corsHeaders });
    }

    // Handle GET callback redirect from Razorpay payment link
    if (req.method === 'GET') {
      const url = new URL(req.url);
      const groupId = url.searchParams.get('group_id');
      const paymentId = url.searchParams.get('razorpay_payment_id') || url.searchParams.get('razorpay_payment_link_id');
      const status = url.searchParams.get('razorpay_payment_link_status');

      // Redirect to frontend payment success page
      const frontendUrl = Deno.env.get('SUPABASE_URL')?.replace('.supabase.co', '.lovable.app') || '';
      // Use a generic redirect — the frontend handles subscription creation
      const redirectUrl = `${frontendUrl}/payment-success?group_id=${groupId}&payment_id=${paymentId}&status=${status}`;

      return new Response(null, {
        status: 302,
        headers: { ...corsHeaders, 'Location': redirectUrl },
      });
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: corsHeaders });
  } catch (error) {
    console.error('Webhook error:', error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});
