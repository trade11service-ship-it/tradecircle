# RA Circle — Pass-Through Compliance Onboarding

Rebuild the subscribe flow so RA Circle never touches client money and never exposes raw PAN. Money goes directly to each analyst's own payment setup; RA Circle records identity, consent, and a hardened PDF agreement for 5-year SEBI audit.

## Decisions locked in
- **Payments:** full switch to analyst-owned collection, with two modes — a static payment link, or the analyst's own merchant keys for in-app checkout.
- **KYC:** provider-agnostic edge function running in sandbox mode (format validation + mock pass) until real Digio/Cashfree keys are added.
- **PAN:** new onboarding stores an encrypted PAN plus a masked display value; existing rows untouched for audit.

---

## Phase 1 — Database

Reuse existing `profiles`, `groups`, `subscriptions` rather than duplicating them.

**`groups` — add:**
- `payment_mode` (text, `payment_link` or `merchant_keys`)
- `advisor_payment_url` (text, optional)
- `advisor_merchant_key_id` (text, optional)
- `advisor_merchant_key_secret` (text, optional — stored encrypted, backend-read only)
- `duration_days` (integer, default 30)

**New `client_onboarding`:** user, group, `kyc_verified`, `kra_status`, `kyc_reference_id`, `pan_masked`, `encrypted_pan`, `consent_given`, `consent_ip_address`, `consent_user_agent`, `consent_timestamp`, `mitc_version`, `pdf_vault_url`, `payment_status` (`pending`/`captured`/`failed`), `payment_reference_id`.

**New `compliance_logs` (append-only):** onboarding ref, advisor ref, client email, `event_type` (`KYC_VERIFIED`, `MITC_ACCEPTED`, `PAYMENT_CAPTURED`, `PDF_HARDENED`), `metadata_json`.

**`subscriptions` — add** `onboarding_id` link.

**Access rules:**
- Clients see only their own onboarding rows; analysts see rows for their own groups; admins see all.
- `encrypted_pan` and `advisor_merchant_key_secret` are readable only by backend service code — never selectable by clients, analysts, or admins through the app. Dashboards show masked PAN and a masked key secret (`••••1234`) only.
- Public group reads never expose the merchant secret.
- `compliance_logs`: insert allowed, edits and deletes blocked for everyone except backend service code.
- New private storage bucket `compliance-vault`, readable only by the client, the owning analyst, and admins.

**Encryption key:** a server-only `PAN_ENCRYPTION_KEY` is generated and stored as a backend secret, used for both PAN and merchant secret encryption. Never present in frontend code.

## Phase 2 — Subscribe stepper (`src/components/SubscribeFlow.tsx`)

Replaces `SubscriptionModal.tsx`. Four steps with clear loading states while compliance checks run:

1. **Plan & analyst details** — group name, fee, duration, analyst legal name, SEBI registration number.
2. **Identity verification** — PAN + DOB, privacy disclaimer naming the analyst and SEBI reg no. Values are posted straight to `kyc-verify` and cleared from component state; the browser keeps only the masked form.
3. **MITC consent** — scrollable SEBI Most Important Terms & Conditions populated with the analyst's details, one mandatory checkbox, capturing IP, user-agent, and server timestamp.
4. **Payment handoff — branches on the group's `payment_mode`:**
   - **Merchant keys:** an edge function creates an order using the analyst's decrypted credentials and returns the order details; the client completes an in-app Razorpay checkout popup and the signature is verified server-side.
   - **Payment link:** redirect to `advisor_payment_url` with `onboarding_id` appended as reference.
   - If neither is configured, the subscribe button is disabled with an explanatory message.

## Phase 3 — Payment return handshake (`/payment-success` rework)

- Reads `onboarding_id` and an optional `txn_id` from the URL.
- **With `txn_id`:** calls `payment-confirm` immediately and shows a verifying state.
- **Without `txn_id`:** shows a clean single-field form asking the client for their Payment Reference / UTR number, with short guidance on where to find it, then submits to `payment-confirm`.
- In-app merchant checkout skips this screen entirely — confirmation is automatic after signature verification.
- On success: confirmation screen with a "Join Telegram Premium Channel" call to action.

## Phase 4 — Edge functions

- **`kyc-verify`** — adapter interface with a `sandbox` implementation (PAN regex + DOB sanity, mock KRA response). Encrypts the raw PAN server-side and stores `encrypted_pan` + `pan_masked`. Returns only `kyc_reference_id`, `kra_status`, and the masked PAN.
- **`advisor-checkout`** — for merchant-keys mode: decrypts the analyst's credentials in memory, creates the order with their gateway, and returns only the public order ID and key ID to the browser.
- **`payment-confirm`** — verifies the gateway signature (merchant mode) or validates the supplied reference (link mode), marks onboarding `captured`, creates the `subscriptions` row with dates from `duration_days`, logs `PAYMENT_CAPTURED`, and triggers PDF generation.
- **`generate-compliance-pdf`** — decrypts `encrypted_pan` in function memory only, builds a flattened, non-editable PDF with full name, full PAN, timestamp, IP, user-agent, payment reference and full MITC text; uploads to `compliance-vault/{advisor_id}/{onboarding_id}.pdf`; emails a copy to client and analyst; logs `PDF_HARDENED`.

## Phase 5 — Advisor dashboard

- **Payment settings:** a mode selector with two panels —
  1. *Payment Link* — paste a static payment page URL.
  2. *Merchant API Integration* — enter Key ID and Key Secret for seamless in-app checkout, with a note that the secret is encrypted and never displayed again.
  Banner when neither is configured: "Subscriptions paused — configure your payment method in settings."
- **Client compliance log:** Client Name, Email, KYC Status, Masked PAN, Agreement Date, and a link to the hardened PDF.
- **SEBI audit export:** replaces the current CSV export — identity logs, agreement timestamps, IP addresses, payment reference IDs, and vault links.

## Phase 6 — Retire platform collection

- `initiate-payment` and `create-payment-link` are removed from the subscribe path; the existing webhook remains only to reconcile legacy subscriptions.
- Advisor earnings / platform-fee widgets are hidden, since fees are no longer taken from advice revenue. Historical earnings data is preserved.

---

## Technical notes
- Raw PAN and analyst merchant secrets exist in plaintext only in transit and briefly in edge-function memory. At rest both are encrypted with a key held only in backend secrets.
- `compliance_logs` immutability and secret-column inaccessibility are enforced at the database permission layer, not just in application code.
- Existing `subscriptions.pan_number` and `financial_compliance_archive` rows are left intact; the new flow simply stops writing to them.
- Telegram invite generation reuses the existing bot integration, gated on `payment_status = 'captured'`.

## Not included
- Real KYC provider integration (needs Digio/Cashfree credentials).
- B2B SaaS billing of analysts — separate build once this is live.
