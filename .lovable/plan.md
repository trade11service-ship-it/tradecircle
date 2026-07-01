## Goals

Make earnings, advisor listings, and referrals **clear, correct, and enforced** — no rejected advisors polluting main lists, referrals fully wired end-to-end, one permanent referral link per advisor, and 15% fee applied automatically when a subscription came via that link.

---

## 1. `advisor_daily_earnings` — clarity + trust

Problems: 20-decimal noise (`3690.0000000000000000000000`), no clear naming, no per-referral vs standard breakdown, no easy read for the dashboard.

Changes:
- Round all money columns to `NUMERIC(12,2)` so values render as `3690.00`.
- Add columns: `referral_gross`, `standard_gross`, `referral_subs_count` — so an advisor sees "of ₹15,000, ₹5,000 came from referral links".
- Update `record_subscription_earning()` trigger to split values by `subscriptions.from_referral`.
- Backfill existing 3 rows to `NUMERIC(12,2)` and split totals using the linked subscriptions.
- Add a `get_advisor_earnings_breakdown(_advisor_id, _from, _to)` RPC returning daily + monthly + referral vs standard for the dashboard chart.

---

## 2. Advisor lists — hide rejected, isolate them

Problems: rejected advisors (`surya` x2) sit in the same `advisors` table and can leak into admin lists / stats.

Changes:
- Create new table `rejected_advisor_applications` (mirrors `advisors` shape, minus public fields) with strict admin-only RLS.
- On admin reject: move the row into `rejected_advisor_applications` with `rejected_at`, `rejected_by`, `rejection_reason`, then delete from `advisors`. This is done via a new `admin_reject_advisor(_advisor_id, _reason)` SECURITY DEFINER RPC.
- Update `admin_list_advisors()` default filter to exclude `rejected` (already status-scoped, but we also drop the row now).
- Add `admin_list_rejected_applications()` RPC + a "Rejected Applications" sub-tab in Admin Dashboard so history is preserved but out of the main flow.
- Ensure `FeaturedAdvisors`, `Discover`, `ListedAdvisors`, and public RPCs already filter `status = 'approved'` — audit and fix any that don't.

---

## 3. Referral system — make it real, permanent, and tracked

Current state: `referral_links` row exists with 1 click, 1 signup, 0 conversions. `referral_signups` and `referral_visits` tables exist but nothing is showing in the Advisor Dashboard.

Rules to enforce:
1. **Exactly one referral link per advisor** (not per group). Auto-created on advisor approval; code is permanent and non-editable by the advisor (admin-only override remains).
2. Link works for **any** group the advisor owns — `/join/<CODE>` lands on the advisor's public profile with a group picker, or on the specific group if `?g=<groupId>` is passed.
3. Every visit → `referral_visits` row (via `ReferralLanding.tsx` + `increment_referral_clicks`).
4. Every signup coming from a referral cookie → `referral_signups` row + `increment_referral_signups`.
5. Every paid subscription where `from_referral = true` → sets `subscriptions.platform_fee_percent = 15` (default is 30), marks the matching `referral_signups.converted_to_paid = true`, links `subscription_id`, and `increment_referral_conversions`.
6. Earnings trigger already reads `platform_fee_percent` → automatically applies the lower fee.

Schema changes:
- Drop the `advisor_id + group_id` uniqueness on `referral_links`; add unique constraint on `advisor_id` alone. Migrate the existing per-group row to be the advisor's single link (keep the same code `TC-VIN-4B4D-D4A5O4` so shared URLs don't break).
- Add `referral_links.total_active_subscribers` (computed via view or maintained by trigger).
- Trigger `on_subscription_insert_link_referral`: if `from_referral` and `referral_code` present, backfill `referral_signups.subscription_id` + `converted_to_paid` and bump counters.

UI wiring (Advisor Dashboard → new "Referrals" tab, replacing the current partially-working panel):
- Big card: **Your permanent referral link** + copy / share / QR.
- Stats row: Clicks · Signups · Paid Conversions · Fee saved (₹ delta between 30% and 15%).
- Table: **Users who signed up via your link** — masked name, signup date, converted Yes/No, active subscription Yes/No, current group, monthly revenue.
- Table: **Active referred subscriptions** — group, plan, start/end, amount, 15% badge.
- Realtime: subscribe to `referral_signups` inserts and `subscriptions` updates for this advisor so counts refresh instantly.

Admin side (`AdminReferralTab`):
- Show one row per advisor (not per group) with combined stats.
- "Program cost" = actual 15% × revenue from referral subs (accurate, not an estimate).
- Ability to reset/regenerate an advisor's code (admin only).

---

## 4. Data integrity fixes discovered during review

- Backfill existing `subscriptions` rows: set `platform_fee_percent = 30` where NULL, `= 15` where `from_referral = true`.
- Recompute `advisor_daily_earnings` for those rows so historical numbers align with the new split columns.
- Add a nightly cron (already have the expiry cron pattern) to reconcile `referral_signups.converted_to_paid` in case a webhook is missed.

---

## Technical section

**Migrations (single file):**
1. `ALTER TABLE advisor_daily_earnings` — cast money cols to `NUMERIC(12,2)`, add `referral_gross`, `standard_gross`, `referral_subs_count`.
2. Rewrite `record_subscription_earning()` to split by `from_referral`.
3. `CREATE TABLE rejected_advisor_applications` + GRANTs + admin-only RLS.
4. `admin_reject_advisor()` RPC — moves row, deletes from `advisors`, logs `rejection_reason`.
5. `admin_list_rejected_applications()` RPC.
6. `ALTER TABLE referral_links` — drop `(advisor_id, group_id)` unique, make `group_id` nullable, add unique on `advisor_id`. Migrate existing row: set `group_id = NULL` (advisor-wide).
7. New trigger `link_subscription_to_referral` on `subscriptions` INSERT.
8. Backfill: subs `platform_fee_percent`, earnings rounding, split totals.

**Edge functions touched:**
- `sandbox-confirm-subscription` and `razorpay-webhook`: already read referral cookie → confirm they set `from_referral`, `referral_code`, `referral_advisor_id`, `platform_fee_percent = 15`.

**Frontend files touched:**
- `src/pages/AdvisorDashboard.tsx` — new Referrals tab wiring.
- `src/components/ReferralStatsTab.tsx` — replace mock/derived data with real joins on `referral_signups` + `subscriptions`.
- `src/components/ReferralLinkCard.tsx` — remove per-group creation, fetch advisor-wide link.
- `src/components/AdminReferralTab.tsx` — group by advisor, accurate program cost, add rejected-advisors sub-tab.
- `src/pages/ReferralLanding.tsx` — accept optional `?g=` query for group deep-link.
- `src/pages/AdminDashboard.tsx` — new "Rejected Applications" panel.

**No changes to:** auth flow, KYC flow, signal visibility rules, payment webhook signatures.
