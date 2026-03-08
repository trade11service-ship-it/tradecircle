import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, serviceKey);

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) throw new Error('No auth');

    const { data: { user } } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
    if (!user) throw new Error('Unauthorized');

    const { request_type, reason, group_id, group_name, advisor_name, email } = await req.json();

    // Save to database
    const { data: request, error } = await supabase.from('deletion_requests').insert({
      user_id: user.id,
      request_type,
      reason,
      group_id: group_id || null,
      group_name: group_name || null,
      advisor_name: advisor_name || null,
      email: email || user.email,
      status: 'pending',
    }).select().single();

    if (error) throw error;

    // Send email notification
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (LOVABLE_API_KEY) {
      // We'll use a simple fetch to send email via Supabase edge function
      // For now, log the request - email will be sent via the database record
      console.log(`Deletion request saved: ${request.id} - Type: ${request_type} - From: ${email}`);
    }

    return new Response(JSON.stringify({ success: true, request_id: request.id }), {
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
