## Goal
Fix subscription expiration bug, enforce advisor↔group integrity, ensure consent metadata (PAN, timestamp, IP) is captured & visible, and split consent into two stages (signup vs. subscription) per DPDP + SEBI.

---

## Part 1 — Subscription Expiration (auto-flip status)

**Problem:** `subscriptions.status` stays `'active'` even after `end_date < now()`.

**Fix (two layers, defense in depth):**

1. **Scheduled job (pg_cron + pg_net):** enable `pg_cron`, schedule daily job at 00:15 IST:
   ```sql
   UPDATE public.subscriptions
   SET status = 'expired'
   WHERE status = 'active' AND end_date < now();
   ```
2. **Dynamic validation in reads:** update RPCs / frontend queries that gate access (group feed, paywall, `Subscriptions.tsx`, `GroupDetails.tsx`, `has_active_subscription` checks) to treat a sub as active only when `status='active' AND end_date > now()`. This closes the gap between cron runs.
3. **Immediate one-time backfill** flipping already-expired rows.

---

## Part 2 — Advisor ↔ Group ↔ Subscription integrity

**Rules to enforce at the DB level:**

- Every `groups.advisor_id` must reference exactly one advisor (already FK; verify `NOT NULL`).
- Every `subscriptions` row must have a `group_id` whose `advisor_id` matches `subscriptions.advisor_id` — prevent drift.
- One active subscription per (user_id, group_id).

**Migration:**
- Add trigger `enforce_subscription_group_advisor_match` on `subscriptions` INSERT/UPDATE: raises if `NEW.advisor_id <> (SELECT advisor_id FROM groups WHERE id = NEW.group_id)`.
- Add partial unique index: `UNIQUE (user_id, group_id) WHERE status = 'active'`.
- Backfill: correct any mismatched `advisor_id` rows using the group's true `advisor_id`.

---

## Part 3 — Consent metadata (PAN, consent_timestamp, consent_ip) actually captured

**Current gap:** `SubscriptionModal.tsx` collects PAN + consent but the sandbox/live payment flow doesn't always persist `pan_number`, `consent_timestamp`, `consent_ip` to `subscriptions`, so they show empty in the table.

**Fix:**
1. `SubscriptionModal` → pass `{ pan_number, consent_ip, consent_timestamp, consent_text_version }` when calling `initiate-payment` / `sandbox-confirm-subscription`.
2. `initiate-payment` edge fn: stash these in Razorpay `notes` (already partially there) so webhook can persist.
3. `razorpay-webhook` + `sandbox-confirm-subscription`: write these columns on `subscriptions` insert and mirror into `financial_compliance_archive` (already partially wired — verify PAN path).
4. Add columns if missing: `consent_text_version text`, `consent_user_agent text`.

---

## Part 4 — Two-stage consent (DPDP + SEBI)

**Stage A — Signup (`Register.tsx`, `AdvisorRegister.tsx`):**
- Single **unchecked** checkbox: *"I agree to the Terms of Service and consent to RA Circle processing my profile data per the Privacy Policy."*
- Persist to `user_legal_acceptances` with `acceptance_type='account_signup'`, version, IP, UA, timestamp. Block submit until checked.

**Stage B — Subscription (`SubscriptionModal.tsx`):**
- Replace current single line with **two unchecked** checkboxes:
  1. SEBI Risk Disclosure — *"I acknowledge stock-market signals carry risk; all trading decisions are mine."*
  2. PAN/Data-sharing consent — *"I explicitly consent to sharing my PAN and contact details with {advisorName} for SEBI compliance and subscription mapping."*
- Both must be checked to enable "Pay". Persist both acceptances (with IP + timestamp + advisor_id + group_id) to `user_legal_acceptances` before invoking payment.

---

## Part 5 — Verification

- Run backfill; confirm no active-but-expired rows remain.
- Create test subscription in sandbox → verify `pan_number`, `consent_timestamp`, `consent_ip` populated in both `subscriptions` and `financial_compliance_archive`.
- Attempt to insert a subscription with mismatched advisor_id → trigger rejects.
- Wait past `end_date` (or run cron manually) → status flips to `expired`, paywall re-engages.

---

### Technical file touch-list
- **Migration:** cron job, trigger, unique index, new consent columns, backfill.
- **Edge functions:** `initiate-payment`, `sandbox-confirm-subscription`, `razorpay-webhook`.
- **Frontend:** `SubscriptionModal.tsx`, `Register.tsx`, `AdvisorRegister.tsx`, `Subscriptions.tsx` (dynamic expiry check), `GroupDetails.tsx` / access gate helpers in `src/lib/accessControl.ts`.

No UI redesign — only the consent checkboxes on the two pages change visually.
