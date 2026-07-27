import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, encryptValue, maskSecret } from '../_shared/compliance.ts';

/**
 * Lets an analyst configure how their subscribers pay them.
 *  - payment_link:   a hosted URL owned by the analyst
 *  - merchant_keys:  the analyst's own gateway keys (secret stored encrypted)
 * Reading back never exposes the secret — only a masked hint.
 */
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

    const body = await req.json().catch(() => ({}));
    const groupId: string | undefined = body.group_id;
    if (!groupId) return json({ error: 'group_id is required' }, 400);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );

    // Ownership check: the caller must own the advisor profile behind this group.
    const { data: group } = await admin
      .from('groups')
      .select('id, advisor_id, payment_mode, advisor_payment_url, advisor_merchant_key_id, advisor_merchant_key_secret')
      .eq('id', groupId)
      .maybeSingle();
    if (!group) return json({ error: 'Group not found' }, 404);

    const { data: advisor } = await admin
      .from('advisors')
      .select('id, user_id')
      .eq('id', group.advisor_id)
      .maybeSingle();
    if (!advisor || advisor.user_id !== userId) return json({ error: 'Forbidden' }, 403);

    if (body.action === 'get') {
      return json({
        payment_mode: group.payment_mode ?? 'payment_link',
        advisor_payment_url: group.advisor_payment_url ?? '',
        advisor_merchant_key_id: group.advisor_merchant_key_id ?? '',
        secret_hint: group.advisor_merchant_key_secret ? maskSecret(group.advisor_merchant_key_id ?? 'xxxx') : '',
        has_secret: Boolean(group.advisor_merchant_key_secret),
      });
    }

    const mode = body.payment_mode === 'merchant_keys' ? 'merchant_keys' : 'payment_link';
    const update: Record<string, unknown> = { payment_mode: mode };

    if (mode === 'payment_link') {
      const url = String(body.advisor_payment_url ?? '').trim();
      if (!/^https:\/\/.+/i.test(url)) {
        return json({ error: 'Enter a valid https payment link' }, 400);
      }
      update.advisor_payment_url = url;
    } else {
      const keyId = String(body.advisor_merchant_key_id ?? '').trim();
      const keySecret = String(body.advisor_merchant_key_secret ?? '').trim();
      if (!keyId) return json({ error: 'Key ID is required' }, 400);
      update.advisor_merchant_key_id = keyId;
      if (keySecret) update.advisor_merchant_key_secret = await encryptValue(keySecret);
      else if (!group.advisor_merchant_key_secret) return json({ error: 'Key secret is required' }, 400);
    }

    const { error } = await admin.from('groups').update(update).eq('id', groupId);
    if (error) throw error;

    return json({ ok: true, payment_mode: mode });
  } catch (error) {
    console.error('advisor-payment-settings failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
