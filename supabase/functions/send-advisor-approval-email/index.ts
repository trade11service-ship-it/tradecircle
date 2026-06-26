import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Verify auth — server-side admin check using profiles table (never trust user_metadata)
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No authorization header');
    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');
    const { data: prof } = await supabase.from('profiles').select('role').eq('id', user.id).maybeSingle();
    if (prof?.role !== 'admin') throw new Error('Admin only');

    const { advisor_id, email, full_name } = await req.json();

    // Send email using SendGrid
    const SENDGRID_API_KEY = Deno.env.get('SENDGRID_API_KEY');
    if (!SENDGRID_API_KEY) throw new Error('SendGrid not configured');

    const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${SENDGRID_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        personalizations: [{ to: [{ email }] }],
        from: { email: 'noreply@racircle.in', name: 'RA Circle Team' },
        subject: 'Your RA Circle Advisor Account Has Been Approved! 🎉',
        html: `
          <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px;">
            <h1 style="color: #1B5E20;">Congratulations!</h1>
            <p>Hi <strong>${full_name}</strong>,</p>
            <p>Your RA Circle advisor application has been <strong>approved</strong>!</p>
            <p>You can now:</p>
            <ul>
              <li>Login to your advisor dashboard</li>
              <li>Create trading groups</li>
              <li>Post trading signals</li>
              <li>Start earning from subscribers</li>
            </ul>
            <p style="margin-top: 30px;">
              <a href="https://racircle.in/advisor/dashboard" 
                 style="background-color: #1B5E20; color: white; padding: 12px 24px; 
                        text-decoration: none; border-radius: 6px; display: inline-block;">
                Go to Dashboard
              </a>
            </p>
            <p style="color: #999; font-size: 12px; margin-top: 40px;">
              SEBI Disclaimer: You are SEBI registered (INH). You are solely responsible for regulatory compliance.
            </p>
          </div>
        `,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      console.error('SendGrid error:', error);
      throw new Error(`Email failed: ${response.status}`);
    }

    return new Response(JSON.stringify({ success: true, advisor_id }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('Error:', err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
