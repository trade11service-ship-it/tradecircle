import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, clientIp, MITC_VERSION } from '../_shared/compliance.ts';

/** Records the client's MITC acceptance with server-side IP, user-agent and timestamp. */
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
    const userEmail = (claimsData.claims.email as string) ?? null;

    const { onboarding_id } = await req.json().catch(() => ({}));
    if (!onboarding_id) return json({ error: 'onboarding_id is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: onboarding } = await admin
      .from('client_onboarding')
      .select('id, user_id, advisor_id, kyc_verified')
      .eq('id', onboarding_id)
      .maybeSingle();

    if (!onboarding || onboarding.user_id !== userId) return json({ error: 'Onboarding not found' }, 404);
    if (!onboarding.kyc_verified) return json({ error: 'Identity verification is not complete' }, 400);

    const ip = clientIp(req);
    const ua = req.headers.get('user-agent') ?? '';
    const acceptedAt = new Date().toISOString();

    const { error } = await admin
      .from('client_onboarding')
      .update({
        consent_given: true,
        consent_ip_address: ip,
        consent_user_agent: ua,
        consent_timestamp: acceptedAt,
        mitc_version: MITC_VERSION,
      })
      .eq('id', onboarding_id);
    if (error) throw error;

    await admin.from('compliance_logs').insert({
      onboarding_id,
      ra_id: onboarding.advisor_id,
      user_id: userId,
      client_email: userEmail,
      event_type: 'MITC_ACCEPTED',
      metadata_json: { ip, user_agent: ua, mitc_version: MITC_VERSION, accepted_at: acceptedAt },
    });

    return json({ ok: true, consent_timestamp: acceptedAt, mitc_version: MITC_VERSION });
  } catch (error) {
    console.error('mitc-consent failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
