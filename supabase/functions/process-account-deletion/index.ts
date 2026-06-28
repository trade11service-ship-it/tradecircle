import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

// Admin-only: classifies a user as Bucket A (free → hard delete) or
// Bucket B (paid → anonymize), and processes accordingly.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }
    const token = authHeader.replace('Bearer ', '');

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token);
    const callerId = claims?.claims?.sub as string | undefined;
    if (claimsErr || !callerId) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });
    }

    const admin = createClient(supabaseUrl, serviceKey);

    // Admin gate
    const { data: callerProfile } = await admin.from('profiles')
      .select('role').eq('id', callerId).maybeSingle();
    if (callerProfile?.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: corsHeaders });
    }

    const { target_user_id } = await req.json();
    if (!target_user_id || typeof target_user_id !== 'string') {
      return new Response(JSON.stringify({ error: 'target_user_id required' }), { status: 400, headers: corsHeaders });
    }

    // Classify
    const [{ count: archiveCount }, { count: subCount }] = await Promise.all([
      admin.from('financial_compliance_archive').select('*', { count: 'exact', head: true }).eq('user_id', target_user_id),
      admin.from('subscriptions').select('*', { count: 'exact', head: true }).eq('user_id', target_user_id),
    ]);
    const isPaid = (archiveCount ?? 0) > 0 || (subCount ?? 0) > 0;

    if (isPaid) {
      // BUCKET B — Anonymize, preserve ledger
      const { error: updErr } = await admin.from('profiles').update({
        full_name: 'Deleted User',
        email: `deleted+${target_user_id}@deleted.local`,
        phone: null,
        avatar_url: null,
      }).eq('id', target_user_id);
      if (updErr) {
        return new Response(JSON.stringify({ error: updErr.message }), { status: 500, headers: corsHeaders });
      }

      // Revoke app access — sign out all sessions + disable auth login
      await admin.auth.admin.updateUserById(target_user_id, {
        email: `deleted+${target_user_id}@deleted.local`,
        password: crypto.randomUUID() + crypto.randomUUID(),
        user_metadata: { deleted: true },
        ban_duration: '876000h', // ~100 years
      });

      return new Response(JSON.stringify({ ok: true, bucket: 'B', action: 'anonymized' }), {
        status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // BUCKET A — Free user, hard delete (FK SET NULL keeps legal log intact)
    await admin.from('profiles').delete().eq('id', target_user_id);
    const { error: delErr } = await admin.auth.admin.deleteUser(target_user_id);
    if (delErr) {
      return new Response(JSON.stringify({ error: delErr.message }), { status: 500, headers: corsHeaders });
    }

    return new Response(JSON.stringify({ ok: true, bucket: 'A', action: 'hard_deleted' }), {
      status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), { status: 500, headers: corsHeaders });
  }
});
