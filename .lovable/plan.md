## Goal

Add an Educational Course Marketplace and Creator Studio to RA Circle, fully isolated from the SEBI advisor compliance vault, with an approval-first creator journey, anti-piracy media delivery, and an 80/20 revenue ledger.

## Creator journey (as decided)

```text
1 Signup ─> 2 Build course ─> 3 Admin review ─> 4 Creator KYC ─> 5 Live + 80/20 split
  name/email/phone   upload+price+scrub   compliance gate   PAN + penny drop   payouts ledger
```

A course only becomes publicly visible when `review_status = 'approved'` AND the creator's `kyc_status = 'approved'`.

## 1. Database

New enums: `course_review_status`, `creator_kyc_status`.

New tables (each with GRANTs, RLS enabled, then policies):
- `creator_profiles` — user_id, full_legal_name, phone, email, `pan_masked`, `encrypted_pan`, bank account/IFSC/holder, `payout_vendor_id`, socials, `kyc_status`, rejection_reason. Sensitive columns (`encrypted_pan`, bank number) readable only by `service_role` via column-level grants; the client reads a masked view.
- `courses` — creator_id, title, description, price (whole rupees), `platform_commission_percent` default 20, cover_image_url, course_type, `review_status`, rejection_reason, `is_visible`, reviewed_by/at.
- `course_modules` — course_id, title, content_type (`video` | `pdf_ebook`), `file_storage_path`, sort_order.
- `course_purchases` — user_id, course_id, total_amount, `creator_payout_amount`, `platform_fee_amount`, payment_status, payment_reference_id, `split_transfer_id`, purchase ip/timestamp.
- `creator_payout_ledger` — creator_id, purchase_id, amount, status (`accrued` | `paid`), settled_at. This is the real ledger backing the sandbox split.

Policies: public reads approved+visible courses only; creators manage their own rows; module file paths readable only by purchasers, the owning creator, or admins; purchases readable by buyer, seller creator, and admin; writes to purchases/ledger restricted to `service_role`.

Storage: new private bucket `courses-content` (videos, PDFs) and reuse a public path for cover images. RLS on `storage.objects` limits uploads to the owning creator's folder; no public reads.

Strict isolation: nothing in this module writes to `compliance_logs`, `client_onboarding`, or `compliance-vault`, and no compliance PDF is generated.

## 2. Edge functions

- `creator-kyc-verify` — same sandbox adapter pattern as the existing `kyc-verify`: validates PAN format/NSDL stub + bank penny-drop stub, encrypts PAN with the existing `PAN_ENCRYPTION_KEY`, writes only to `creator_profiles`. Refuses to run unless the creator has at least one approved course.
- `get-course-video-url` — verifies the JWT, confirms a `captured` purchase (or creator/admin ownership), returns a 60-minute signed URL for the private object. Never returns raw paths.
- `course-checkout-split` — creates the order through the central gateway in sandbox mode, computes 20% platform / 80% creator, writes `course_purchases` and `creator_payout_ledger` rows on capture. Transfer call is stubbed behind a `COURSE_SPLIT_MODE` flag so flipping to live Route later is a one-line change.
- `course-content-scan` — server-side re-check of banned words on submit, so the client scrubber can't be bypassed.

## 3. Frontend

Navigation: add **Courses** to the bottom bar / header nav; Creator Studio surfaces in the profile dropdown and as a dashboard tab for users with a `creator_profiles` row.

- `src/pages/Courses.tsx` — marketplace grid with search, category and price filters, cover, creator legal name, type badge, and the mandatory educational-purpose compliance banner.
- `src/pages/CourseDetail.tsx` — syllabus, price, 20% fee disclosure, Buy button → `course-checkout-split`; owned courses show "Start learning".
- `src/pages/CreatorStudio.tsx` — three tabs:
  - **Course Builder** (default first step): title, description, price, type, cover upload, module uploader; live banned-word scrubber over `["guaranteed","100% profit","tips","jackpot","sure shot","daily earnings", ...]` that disables submit and highlights offending terms.
  - **Identity & Payout** — locked until a course is approved, then unlocked with the "Your course is approved — complete PAN & bank verification" banner; PAN, bank, IFSC, socials; real-time verification state.
  - **Sales & Earnings** — gross sales, 20% platform commission, 80% net, accrued vs settled ledger, recent transactions table.
- `src/pages/admin/CourseReview.tsx` (wired into the existing admin shell) — pending queue, in-place preview of video/PDF via signed URLs, the three-point SEBI compliance checklist, Approve / Reject-with-reason.
- `src/pages/CourseLearn.tsx` + `src/components/SecurePlayerModal.tsx` — HTML5 `<video>` fed by short-lived signed URLs, `controlsList="nodownload"`, context menu disabled; PDF.js canvas renderer with selection/copy/print blocked and a `@media print { body { display: none } }` rule; a shared `DynamicWatermark` overlay drifting `{email} | {phone} | timestamp` to a new random position every 4 seconds, plus a diagonal repeating watermark mesh on PDF pages.

## Technical notes

- Video is served from private storage with signed URLs (no transcoding). The player and token function are structured so swapping in an HLS provider later touches only `get-course-video-url` and the player source.
- Payout split is a real ledger with a simulated transfer; no Razorpay Route dependency until your account is approved.
- All new UI uses the existing Institutional Fintech tokens (navy/emerald/slate) — no new hardcoded colors.
