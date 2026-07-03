# Advisor Applications Intake Table + DPDP Retention

## Goal
Add a dedicated `advisor_applications` intake table for SEBI verification with strict DPDP-compliant retention: 60-day auto-expiry, PAN/Aadhaar scrubbing on reject/expire, KYC file deletion from storage, and a third mandatory consent checkbox in the registration UI.

## Architecture

```text
Register.tsx → advisor_applications (holds PAN + Aadhaar)
                    │
        ┌───────────┼────────────┐
     Approve     Reject       60d Expiry
        │           │              │
   copy to      hard-delete    scrub PAN+Aadhaar
   advisors     row entirely   + delete KYC files
   (no Aadhaar) + delete KYC   + status='expired'
   scrub app    files
```

`advisor_applications` is the intake buffer holding sensitive identifiers only during review. On approval, minimal non-sensitive data is copied to the existing `advisors` table (which powers groups/payments/referrals) and Aadhaar is scrubbed from the application row. Rejection hard-deletes everything (per user's earlier choice). The existing `advisors` table stays as-is for approved advisors.

## 1. Database migration

New table `public.advisor_applications`:
- `id` uuid PK, `user_id` uuid unique **REFERENCES auth.users(id) ON DELETE CASCADE**
- `full_name`, `email`, `phone`, `sebi_number`, `pan_number`, `aadhaar_number`, `address`, `bio`, `strategy_type`
- `status` text default `'pending'` — `pending | approved | rejected | expired`
- `rejection_reason`, `reviewed_at`, `reviewed_by`, `created_at`, `updated_at`
- `updated_at` trigger

Grants + RLS:
- `GRANT SELECT, INSERT ON advisor_applications TO authenticated`
- `GRANT ALL TO service_role`
- User can INSERT/SELECT their own row (`auth.uid() = user_id`)
- Admins (via existing `is_admin(auth.uid())`) SELECT/UPDATE/DELETE all

RPCs (all `SECURITY DEFINER`, `SET search_path = public`):

- **`admin_list_pending_applications()`** — returns pending rows for admin dashboard.
- **`admin_approve_application(_app_id uuid)`** — admin check, INSERT into `advisors` (with `pan_no`, without `aadhaar_no`), flip `profiles.role → 'advisor'`, set app `status='approved'`, NULL `aadhaar_number` on app row, record `reviewed_at/by`.
- **`admin_reject_application(_app_id uuid, _reason text)`** — admin check, call `delete_kyc_files_for_user(user_id)`, hard-DELETE the row. No archive.
- **`expire_stale_applications()`** — for `pending` rows older than 60 days: set `status='expired'`, NULL `pan_number` + `aadhaar_number`, call `delete_kyc_files_for_user(user_id)`.
- **`delete_kyc_files_for_user(_user_id uuid)`** — deletes from `storage.objects` using the correct Supabase column names:
  ```sql
  DELETE FROM storage.objects
  WHERE bucket_id = 'kyc-documents'
    AND name LIKE _user_id::text || '%';
  ```

DPDP sweep on the legacy `rejected_advisor_applications` table:
- `ALTER COLUMN pan_no DROP NOT NULL`, `ALTER COLUMN aadhaar_no DROP NOT NULL` (guarded — no-op if already nullable).
- Backfill `UPDATE ... SET pan_no = NULL, aadhaar_no = NULL`.
- Update existing `admin_reject_advisor` RPC to stop writing PAN/Aadhaar into the archive going forward.

Add columns to `advisor_legal_acceptances`:
- `checkbox_3_dpdp_consent boolean`, `checkbox_3_text text`.

## 2. pg_cron job (via `supabase--insert`)

Daily at 03:00 IST → `SELECT public.expire_stale_applications();`. Scheduled via the insert tool (not migration) per Lovable docs for user-specific cron setup.

## 3. `AdvisorRegister.tsx`

- Change insert target from `advisors` → `advisor_applications`.
- Add third checkbox `check3` with exact required text (stored as `DPDP_CONSENT_TEXT` in `src/lib/legalTexts.ts`):
  > "I explicitly consent to STREZONIC PRIVATE LIMITED processing my PAN and Aadhaar numbers for manual SEBI verification. I understand that if my application is rejected, or remains un-actioned for more than 60 days, my sensitive identity records will be permanently erased from the system automatically."
- Store `check3_dpdp_consent + check3_text` in `advisor_legal_acceptances`.
- Submit button disabled unless `check1 && check2 && check3`.
- "Already registered" guard also checks `advisor_applications` for pending rows.

## 4. `AdminDashboard.tsx`

- Fetch pending from `advisor_applications` via new `admin_list_pending_applications` RPC (approved advisors tab still reads `advisors`).
- Pending rows show:
  - Green Approve button (`bg-green-600 hover:bg-green-700 text-white`) → `admin_approve_application` + existing approval email.
  - Red Reject button (`bg-red-600 hover:bg-red-700 text-white`) → existing `RejectApplicationModal` → `admin_reject_application` + existing rejection email.

## 5. Files touched

- `supabase/migrations/<new>.sql` — table (with `ON DELETE CASCADE`), grants, RLS, RPCs (correct `bucket_id`/`name` storage columns), triggers, archive scrub with `DROP NOT NULL` guards, legal-acceptance columns.
- `supabase--insert` — schedule pg_cron job.
- `src/lib/legalTexts.ts` — add `DPDP_CONSENT_TEXT`.
- `src/pages/AdvisorRegister.tsx` — 3rd checkbox, new table target, updated guard.
- `src/pages/AdminDashboard.tsx` — new RPC calls, styled Approve/Reject buttons.
- `src/integrations/supabase/types.ts` — regenerated after migration approval.

## Out of scope

- No changes to groups/payments/referrals/edge functions — they continue keying off `advisors.id` for approved users.
- No trader-facing UI changes.
