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
      .select('title, content_type, file_storage_path')
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

    // Server-side media safety re-check: the browser guard can be bypassed, so
    // verify every stored object is a real PDF/video by its leading bytes.
    const ALLOWED = ['application/pdf', 'video/mp4', 'video/webm', 'video/quicktime'];
    for (const m of modules) {
      const ext = (m.file_storage_path.split('.').pop() ?? '').toLowerCase();
      if (!['pdf', 'mp4', 'm4v', 'webm', 'mov'].includes(ext)) {
        return json({ error: `Unsupported lesson file type ".${ext}". Remove it and re-upload a PDF or video.` }, 400);
      }

      const { data: blob, error: dlErr } = await admin.storage
        .from('courses-content')
        .download(m.file_storage_path);
      if (dlErr || !blob) {
        return json({ error: `Could not verify the file for "${m.title}". Please re-upload it.` }, 400);
      }

      const head = new Uint8Array(await blob.slice(0, 4096).arrayBuffer());
      const at = (i: number) => head[i];
      const str = (s: number, l: number) =>
        Array.from(head.slice(s, s + l)).map((b) => String.fromCharCode(b)).join('');

      let detected: string | null = null;
      if (at(0) === 0x25 && at(1) === 0x50 && at(2) === 0x44 && at(3) === 0x46) detected = 'application/pdf';
      else if (at(0) === 0x1a && at(1) === 0x45 && at(2) === 0xdf && at(3) === 0xa3) detected = 'video/webm';
      else if (str(4, 4) === 'ftyp') detected = str(8, 2).toLowerCase() === 'qt' ? 'video/quicktime' : 'video/mp4';

      if (!detected || !ALLOWED.includes(detected)) {
        return json({ error: `The file for "${m.title}" is not a valid PDF or video. Upload rejected.` }, 400);
      }

      const text = str(0, Math.min(head.length, 4096)).toLowerCase();
      if (['<script', '<?php', '<html', '<svg', '#!/bin/'].some((mark) => text.includes(mark))) {
        return json({ error: `The file for "${m.title}" contains embedded script content and was rejected.` }, 400);
      }

      if (detected === 'application/pdf') {
        const pdfHead = new Uint8Array(await blob.slice(0, 2_000_000).arrayBuffer());
        const pdfText = Array.from(pdfHead).map((b) => String.fromCharCode(b)).join('').toLowerCase();
        if (['/javascript', '/launch', '/embeddedfile', '/openaction'].some((mark) => pdfText.includes(mark))) {
          return json({ error: `The PDF for "${m.title}" contains scripts or embedded files. Export a flattened PDF.` }, 400);
        }
      }
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
