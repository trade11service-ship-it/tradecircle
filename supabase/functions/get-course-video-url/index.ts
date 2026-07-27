import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/compliance.ts';

/**
 * Issues a short-lived signed URL for a private course module file.
 * Access requires a captured purchase, ownership of the course, or admin.
 * Raw storage paths are never returned to the browser.
 */
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401);

    const anon = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: claimsData, error: claimsError } = await anon.auth.getClaims(authHeader.replace('Bearer ', ''));
    if (claimsError || !claimsData?.claims) return json({ error: 'Unauthorized' }, 401);
    const userId = claimsData.claims.sub as string;

    const body = await req.json().catch(() => ({}));
    const moduleId = String(body.module_id ?? '').trim();
    if (!moduleId) return json({ error: 'module_id is required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: mod } = await admin
      .from('course_modules')
      .select('id, course_id, title, content_type, file_storage_path')
      .eq('id', moduleId)
      .maybeSingle();
    if (!mod) return json({ error: 'Module not found' }, 404);

    // Entitlement checks
    const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).maybeSingle();
    const isAdmin = profile?.role === 'admin';

    let allowed = isAdmin;

    if (!allowed) {
      const { data: course } = await admin
        .from('courses')
        .select('id, creator_id, creator_profiles!inner(user_id)')
        .eq('id', mod.course_id)
        .maybeSingle();
      // deno-lint-ignore no-explicit-any
      if ((course as any)?.creator_profiles?.user_id === userId) allowed = true;
    }

    if (!allowed) {
      const { data: purchase } = await admin
        .from('course_purchases')
        .select('id')
        .eq('user_id', userId)
        .eq('course_id', mod.course_id)
        .eq('payment_status', 'captured')
        .maybeSingle();
      if (purchase) allowed = true;
    }

    if (!allowed) return json({ error: 'You do not have access to this course.' }, 403);

    const { data: signed, error } = await admin.storage
      .from('courses-content')
      .createSignedUrl(mod.file_storage_path, 3600);
    if (error || !signed) throw error ?? new Error('Could not sign media URL');

    return json({
      url: signed.signedUrl,
      expires_in: 3600,
      content_type: mod.content_type,
      title: mod.title,
    });
  } catch (error) {
    console.error('get-course-video-url failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
