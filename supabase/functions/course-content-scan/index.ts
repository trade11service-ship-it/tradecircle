import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json } from '../_shared/compliance.ts';
import { findBannedWords } from '../_shared/courses.ts';

/**
 * Server-side compliance scrub. The Creator Studio runs the same list live in
 * the browser, this endpoint re-checks on submit so the client can't be bypassed
 * and flips the course into the admin review queue.
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
    const courseId = String(body.course_id ?? '').trim();
    if (!courseId) return json({ error: 'course_id is required' }, 400);

    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    const { data: creator } = await admin
      .from('creator_profiles')
      .select('id')
      .eq('user_id', userId)
      .maybeSingle();
    if (!creator) return json({ error: 'Creator profile not found' }, 404);

    const { data: course } = await admin
      .from('courses')
      .select('id, title, description, creator_id, review_status')
      .eq('id', courseId)
      .maybeSingle();
    if (!course || course.creator_id !== creator.id) return json({ error: 'Course not found' }, 404);

    const { data: modules } = await admin
      .from('course_modules')
      .select('title')
      .eq('course_id', courseId);

    const flagged = findBannedWords(
      course.title,
      course.description,
      (modules ?? []).map((m) => m.title).join(' '),
    );

    if (flagged.length) {
      return json(
        {
          error: 'Your course contains promotional language that breaches SEBI advertising norms.',
          flagged,
        },
        400,
      );
    }

    if (!modules?.length) {
      return json({ error: 'Add at least one video or e-book module before submitting.' }, 400);
    }

    const { error } = await admin
      .from('courses')
      .update({ review_status: 'pending_review', is_visible: false, rejection_reason: null })
      .eq('id', courseId);
    if (error) throw error;

    return json({ review_status: 'pending_review', flagged: [] });
  } catch (error) {
    console.error('course-content-scan failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
