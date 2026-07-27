import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { corsHeaders, json, clientIp } from '../_shared/compliance.ts';
import { splitAmount } from '../_shared/courses.ts';

/**
 * Course checkout with an 80/20 marketplace split.
 *
 * COURSE_SPLIT_MODE=sandbox (default): the order is simulated, the purchase is
 * captured immediately and the ledger is written for real. Flip the env var to
 * `live` once Razorpay Route is approved — only createTransfer() changes.
 */

const MODE = Deno.env.get('COURSE_SPLIT_MODE') ?? 'sandbox';

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

    const { data: course } = await admin
      .from('courses')
      .select('id, title, price, platform_commission_percent, creator_id, review_status, is_visible')
      .eq('id', courseId)
      .maybeSingle();
    if (!course || course.review_status !== 'approved' || !course.is_visible) {
      return json({ error: 'Course is not available for purchase.' }, 404);
    }

    const { data: creator } = await admin
      .from('creator_profiles')
      .select('id, kyc_status, payout_vendor_id, user_id')
      .eq('id', course.creator_id)
      .maybeSingle();
    if (!creator || creator.kyc_status !== 'approved') {
      return json({ error: 'This creator has not completed payout verification yet.' }, 400);
    }
    if (creator.user_id === userId) return json({ error: 'You cannot buy your own course.' }, 400);

    const { data: existing } = await admin
      .from('course_purchases')
      .select('id')
      .eq('user_id', userId)
      .eq('course_id', courseId)
      .eq('payment_status', 'captured')
      .maybeSingle();
    if (existing) return json({ error: 'You already own this course.', purchase_id: existing.id }, 400);

    const total = Number(course.price);
    const { platform_fee_amount, creator_payout_amount } = splitAmount(
      total,
      Number(course.platform_commission_percent ?? 20),
    );

    const reference = MODE === 'sandbox' ? `sbx_course_${crypto.randomUUID()}` : `rzp_${crypto.randomUUID()}`;
    const transferId = MODE === 'sandbox' ? `sbx_trf_${crypto.randomUUID().slice(0, 12)}` : null;
    const status = MODE === 'sandbox' ? 'captured' : 'pending';

    const { data: purchase, error } = await admin
      .from('course_purchases')
      .insert({
        user_id: userId,
        course_id: courseId,
        creator_id: creator.id,
        total_amount: total,
        creator_payout_amount,
        platform_fee_amount,
        payment_status: status,
        payment_reference_id: reference,
        split_transfer_id: transferId,
        purchase_ip_address: clientIp(req),
      })
      .select('id')
      .single();
    if (error) throw error;

    if (status === 'captured') {
      await admin.from('creator_payout_ledger').insert({
        creator_id: creator.id,
        purchase_id: purchase.id,
        amount: creator_payout_amount,
        status: 'accrued',
      });
    }

    return json({
      mode: MODE,
      purchase_id: purchase.id,
      payment_status: status,
      payment_reference_id: reference,
      total_amount: total,
      platform_fee_amount,
      creator_payout_amount,
    });
  } catch (error) {
    console.error('course-checkout-split failed:', error);
    return json({ error: (error as Error).message }, 500);
  }
});
