import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { sendLovableEmail } from "npm:@lovable.dev/email-js";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-internal-trigger',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
  const supabase = createClient(supabaseUrl, serviceKey);

  let messageId: string | null = null;
  let email = '';

  try {
    const authHeader = req.headers.get('Authorization') || '';
    const bearer = authHeader.replace(/^Bearer\s+/i, '');
    if (!bearer) throw new Error('No authorization header');

    // Allow the DB trigger / cron / RPC to call this with the service role key.
    const isInternalService = bearer === serviceKey;

    if (!isInternalService) {
      // Otherwise this must be an authenticated admin session.
      const { data: { user } } = await supabase.auth.getUser(bearer);
      if (!user) throw new Error('Unauthorized');
      const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
      if (prof?.role !== 'admin') throw new Error('Admin only');
    }

    const body = await req.json();
    const advisor_id = body.advisor_id;
    const full_name = body.full_name;
    email = body.email;
    messageId = body.message_id || `advisor-approval-${advisor_id}`;

    // Idempotency: if we already marked this message as sent, skip.
    const { data: existing } = await supabase
      .from('email_send_log')
      .select('id,status')
      .eq('message_id', messageId!)
      .maybeSingle();
    if (existing?.status === 'sent') {
      return new Response(JSON.stringify({ success: true, skipped: true }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Ensure a log row exists (RPC inserts one, but manual admin dispatches may not).
    if (!existing) {
      await supabase.from('email_send_log').insert({
        message_id: messageId, template_name: 'advisor-approval',
        recipient_email: email, status: 'queued',
        metadata: { advisor_id, full_name },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) throw new Error('Lovable email not configured');

    const html = `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #0EA5E9;">Congratulations, ${full_name}!</h1>
            <p>Your RA Circle advisor application has been <strong>approved</strong>.</p>
            <p>You can now:</p>
            <ul>
              <li>Login to your advisor dashboard</li>
              <li>Create trading groups</li>
              <li>Post trading signals</li>
              <li>Start earning from subscribers</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="https://racircle.in/advisor/dashboard"
                 style="background-color: #0EA5E9; color: white; padding: 12px 24px;
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">
              SEBI Disclaimer: You are SEBI registered (INH). You are solely responsible for regulatory compliance.
            </p>
          </div>
        `;

    await sendLovableEmail(
      {
        message_id: messageId,
        to: email,
        from: 'RA Circle <compliance@racircle.in>',
        sender_domain: 'notify.racircle.in',
        subject: 'Your RA Circle Advisor Account Has Been Approved! 🎉',
        html,
        text: `Congratulations, ${full_name}! Your RA Circle advisor application has been approved. Open your dashboard: https://racircle.in/advisor/dashboard`,
        purpose: 'transactional',
        label: 'advisor-approval',
        idempotency_key: messageId,
      },
      { apiKey: LOVABLE_API_KEY, sendUrl: Deno.env.get('LOVABLE_SEND_URL') }
    );

    await supabase.from('email_send_log').update({ status: 'sent' }).eq('message_id', messageId!);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('send-advisor-approval-email error:', err);
    if (messageId) {
      await supabase.from('email_send_log').update({
        status: 'failed', error_message: String(err?.message || err).slice(0, 500),
      }).eq('message_id', messageId).then(() => {}, () => {});
    }
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
