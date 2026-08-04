# Creator earnings, course preview, manual payouts, and homepage mix

## 1. Admin: creator earnings and sales visibility

New **Creators** tab in the admin panel (next to Courses):

- Creator list: name, email, Instagram/YouTube, KYC status, live/pending/draft course counts, total sales count, gross revenue, platform fee earned, creator net payable, amount already marked paid, and outstanding balance.
- Click a creator to expand: their courses with per-course sales count and revenue, plus a buyer list (buyer name, course, amount, payment reference, date).
- CSV export for both the creator summary and the purchase rows.
- Payout actions: see section 3.

## 2. Creator Studio: view own course, delete course

- Each course card gets a **Preview** action that opens the real learner player for that course (creators always get access to their own content, even before approval).
- Each course gets a **Delete** action (typed confirmation). Deleting is blocked once a course has at least one paid purchase — those become "Unlist" instead, so financial records stay intact.
- Lesson delete already exists and stays.

## 3. Manual payout requests (weekly settlement)

Settlement window: **Sunday to Saturday**. Payouts are paid manually by your team.

- Creator Studio → Earnings shows: settled amount, unsettled balance for the closed week, next request window.
- **Request Payout** button is enabled only on Saturday and Sunday (India time), only when KYC is approved and the unsettled balance is at least the minimum threshold (₹500, matching the advisor rule). Otherwise it shows why it is disabled.
- A request creates a payout request record (creator, period start/end, amount, status `requested`).
- Admin Creators tab lists payout requests and lets an admin mark them `paid` with a reference note (UTR/manual note) and date. Marking paid flips the covered ledger rows to settled so the balance resets.

## 4. Purchase data — what we store today

Already stored per purchase: purchase id, buyer id, course id, creator id, total amount, creator payout amount, platform fee, payment status, payment reference id (Razorpay), split transfer id, buyer IP, timestamp. A payout ledger row is accrued per purchase.

Gaps I will close in this work:
- Store the payment method and the Razorpay order/payment pair (currently only one reference field is used consistently).
- Store a human-readable invoice number per purchase for accounting.
- Payout records will carry the manual UTR/reference so a payout can be traced to purchases.

No UIN is needed for course sales — courses are educational content, not SEBI advisory, so the advisor SEBI/UIN fields stay isolated from creator records.

## 5. Creator public profile (post-verification)

Creators get a profile section in Studio: profile photo, banner, short bio, and one short intro video (separate from paid course content).
- Editable any time, but only shown publicly after KYC is approved.
- Public creator page shows photo, banner, bio, intro video, socials, and their live courses.

## 6. Homepage: advisors + courses mix

Homepage keeps advisors first, then adds — below the existing advisor/feed sections:
- A **Learn from creators** strip: horizontally scrollable course cards (cover, title, creator, price) with a "View all courses" link.
- A **Featured creators** strip: avatar, name, course count, link to their creator page.
- A compact shortcut row (Advisors / Courses / Public feed / Creators) so both sides of the marketplace are reachable in one tap.

Same strips appear on the signed-in trader home, after their groups and signals.

## 7. Headline update

Current positioning is advisor-only. Options for the new mixed marketplace:

1. "India's trusted circle for SEBI advisors and market educators" — sub: "Verified research analysts for live calls. Trusted creators for structured learning. One secure platform."
2. "Follow verified analysts. Learn from proven educators." — sub: "SEBI-registered advisory groups and expert-built courses, in one place."
3. "Where verified advice meets real market education" — sub: "SEBI-verified analysts and vetted finfluencer courses, all under one compliant roof."

I will use option 1 unless you pick another.

## Technical notes

- New table `creator_payout_requests` (creator, period start/end, amount, status, requested_at, paid_at, admin reference, admin id) with RLS: creators read/insert their own, admins read/update all.
- New admin-only SECURITY DEFINER RPCs: `admin_list_creator_earnings()`, `admin_list_course_purchases(_creator_id)`, `admin_mark_payout_paid(_request_id, _reference)`.
- New creator RPC `creator_payout_summary()` for settled/unsettled balances derived from `creator_payout_ledger`.
- Course delete guarded server-side: reject when a captured purchase exists; unlist sets `is_visible = false`.
- Creator profile media (photo, banner, intro video) uploaded through the existing `uploadGuard` MIME/size checks; intro video goes to a public creator bucket, course content stays in the private signed-URL bucket.
- Homepage strips reuse `list_public_courses()`; no new client-side table reads.
