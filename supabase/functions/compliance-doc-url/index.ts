import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/compliance.ts';

/** Issues a short-lived signed URL for a vaulted agreement, for the client, their RA, or an admin. */
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

    const { onboarding_id } = await req.json().catch(() => ({}));
    if (!onboarding_id) return json({ error: 'onboarding_id is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    const { data: onboarding } = await admin
      .from('client_onboarding')
      .select('id, user_id, advisor_id, pdf_vault_url')
      .eq('id', onboarding_id)
      .maybeSingle();
    if (!onboarding?.pdf_vault_url) return json({ error: 'Agreement not available yet' }, 404);

    let allowed = onboarding.user_id === userId;
    if (!allowed) {
      const { data: advisor } = await admin
        .from('advisors')
        .select('user_id')
        .eq('id', onboarding.advisor_id)
        .maybeSingle();
      allowed = advisor?.user_id === userId;
    }
    if (!allowed) {
      const { data: isAdmin } = await admin.rpc('is_admin', { _user_id: userId });
      allowed = Boolean(isAdmin);
    }
    if (!allowed) return json({ error: 'Forbidden' }, 403);

    const { data: signed, error } = await admin.storage
      .from('compliance-vault')
      .createSignedUrl(onboarding.pdf_vault_url, 300);
    if (error) throw error;

    return json({ url: signed?.signedUrl });
  } catch (error) {
    console.error('compliance-doc-url failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
