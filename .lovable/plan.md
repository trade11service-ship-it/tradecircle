# Offline-First Advisor Onboarding + Shared Digio Adapter

Note on file locations: there is no `src/pages/admin/` directory — admin UI lives in `src/pages/AdminDashboard.tsx` (which already calls `admin_list_pending_applications`). The offline review queue will be a new `src/components/admin/OfflineReviewQueue.tsx` mounted as a tab there, matching the existing `src/components/admin/CourseReviewTab.tsx` pattern.

## 1. Database migration

`advisor_applications`
- Drop `aadhaar_number` column entirely.
- Status values become: `pending_offline_review` → `pre_approved` → `approved` (plus `rejected`, `expired`). Existing `pending` rows migrate to `pending_offline_review`.

`advisors` — add deferred-KYC columns:
- `kyc_status` (`unverified` | `pending` | `approved` | `rejected`, default `unverified`)
- `pan_masked`, `encrypted_pan`, `bank_account_number` (encrypted), `bank_ifsc`, `bank_account_holder_name`, `payout_vendor_id`, `kyc_rejection_reason`
- Drop `aadhaar_no` and `aadhaar_photo_url` from `advisors`; drop `aadhaar_no` from `rejected_advisor_applications`.

New `kyc_audit_events` table (PII-free): `id`, `subject_type` (advisor/creator/client), `subject_id`, `check_type` (pan/penny_drop), `transaction_id`, `status_verdict`, `created_at`. Admin-read only, service_role write, no update/delete.

RPC changes:
- `admin_pre_approve_application(_app_id)` — replaces the current approve path. Creates the `advisors` row with `status = 'pre_approved'`, `kyc_status = 'unverified'`, sets profile role to `advisor`, keeps the approval email but reworded to "pre-approved, complete verification".
- `admin_approve_application` is retired (kept as a thin wrapper that raises, so nothing silently uses the old flow).
- `expire_stale_applications` updated for the new status name and the dropped Aadhaar column.
- New `scrub_stale_kyc()` — nulls `encrypted_pan`, `pan_masked`, `bank_account_number`, `bank_ifsc`, `bank_account_holder_name` on advisor rows with `kyc_status IN ('rejected','unverified')` and on `creator_profiles` with `kyc_status = 'rejected'`, older than 60 days. Scheduled via pg_cron daily.
- Group creation gate: RLS on `groups` INSERT tightened to require the owning advisor row have `status = 'approved'` AND `kyc_status = 'approved'`.

## 2. Shared Digio adapter

New `supabase/functions/_shared/digio.ts`:
- `verifyPan(pan, name)` and `pennyDrop(account, ifsc, holder)` returning `{ ok, transaction_id, verdict, reason? }`.
- Switch on `KYC_PROVIDER`: `sandbox` keeps today's format/regex behaviour; `digio` calls Digio over HTTP Basic auth (`DIGIO_CLIENT_ID`:`DIGIO_CLIENT_SECRET`) against `DIGIO_BASE_URL`.
- Returns only the transaction id and verdict — the raw vendor JSON is never returned, logged, or stored.
- Writes one `kyc_audit_events` row per call.

Rewire `kyc-verify` (advisory subscriber) and `creator-kyc-verify` (course seller) onto it; sandbox behaviour is unchanged so nothing breaks before Digio approval.

## 3. New `advisor-kyc-verify` edge function

- Auth required; resolves the caller's advisor row.
- Rejects unless `status = 'pre_approved'`.
- Validates PAN + bank fields, runs `verifyPan()` then `pennyDrop()`.
- On success: encrypts PAN and account number with the existing `PAN_ENCRYPTION_KEY` helper, stores masked PAN + IFSC + holder name, sets `kyc_status = 'approved'` and `status = 'approved'`.
- On failure: `kyc_status = 'rejected'` with a reason, no PII retained beyond the encrypted values.

## 4. Frontend

`src/pages/AdvisorRegister.tsx`
- Remove the Aadhaar field and the whole KYC step; the form becomes SEBI details + contact + bio + review/consent.
- Submits with `status: 'pending_offline_review'`; status screens updated for the new states.

`src/components/admin/OfflineReviewQueue.tsx` (new, mounted in `AdminDashboard.tsx`)
- Lists `pending_offline_review` applications with SEBI number, a link to the SEBI intermediary lookup, and **Pre-Approve** / **Reject** actions.
- Second section lists `pre_approved` advisors still awaiting KYC, read-only, so admin can see who is stuck.

`src/pages/AdvisorDashboard.tsx`
- New gate: when `kyc_status !== 'approved'`, group/signal creation controls are disabled behind the banner *"Your profile is pre-approved! Complete PAN & Bank verification to unlock Group Creation."*
- New **Verification** tab with the PAN + account number + IFSC + holder name form calling `advisor-kyc-verify`, showing pending/rejected state and the rejection reason.

## 5. Privacy / DPDP

- Purpose notice component rendered above all three KYC forms (advisor verification, creator identity tab, subscriber subscribe flow): *"Why we need this: Verified for identity match, SEBI compliance, and payout processing via Digio. Retained as encrypted data."*
- `src/pages/Privacy.tsx`: add a data-processors section naming Digio (identity & bank verification), Razorpay (payments), SendGrid (email), with the data categories shared and the 60-day scrub policy for failed/abandoned verification.

## Secrets needed from you

Add before flipping `KYC_PROVIDER` to `digio` — sandbox credentials are fine now:
- `DIGIO_CLIENT_ID`
- `DIGIO_CLIENT_SECRET`
- `DIGIO_BASE_URL`
- `KYC_PROVIDER` (defaults to `sandbox` if unset, so nothing breaks meanwhile)

Course buyers stay untouched — no PAN, no KYC, direct checkout.
