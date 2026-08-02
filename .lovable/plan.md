## Goal

Make Creator Studio uploads (cover image, video lessons, PDF e-books) work reliably, and make every file upload on the platform safe — no scripts, no disguised executables, no oversized or unverified files.

## 1. Fix the cover-upload RLS failure

What I verified in the database:
- `courses-content` and `group-media` both have creator upload policies keyed on `current_creator_id()`, and that function is executable by `authenticated`.
- `group-media` has **no SELECT policy** on `storage.objects`, and the cover upload is called with `upsert: true`, which makes the storage layer perform a read + conditional update path in addition to the insert.
- Only one `creator_profiles` row exists, so the failure can also occur when a user reaches the course form before their creator row is committed.

Because the exact trigger is not yet confirmed, step one is to reproduce the upload as a signed-in creator and read the precise policy that rejects it. Then:

- Drop `upsert: true` on cover uploads (paths are UUID-based, upsert is never needed) so only the INSERT policy is exercised.
- Add the missing `storage.objects` SELECT policy for `group-media` (public bucket, so read is already public over HTTP — this just aligns the table policy) and a matching SELECT for creator course covers.
- Guard the UI: block the cover/lesson upload until a `creator_profiles` row exists, and re-fetch the creator id right before upload instead of trusting stale state.
- Apply the same reproduction check to `courses-content` lesson uploads (video + PDF) and fix any policy gap found there the same way.

## 2. Upload safety layer (new `src/lib/uploadGuard.ts`)

A single validator used by every upload site in the app:

- **Extension + MIME allowlist**
  - Images: `jpg, jpeg, png, webp` (`image/*` subset). **SVG is rejected** — it can carry scripts.
  - Documents: `pdf` only.
  - Video: `mp4, webm, mov`.
- **Magic-byte sniffing** — read the first bytes of the file and confirm the real signature matches the claimed type (`%PDF-`, JPEG `FF D8 FF`, PNG signature, WebP `RIFF….WEBP`, MP4/MOV `ftyp`, WebM `1A 45 DF A3`). A `.mp4` that is really a ZIP or an EXE is rejected.
- **Content scan for text-ish payloads** — reject files whose head contains `<script`, `<?php`, `<!DOCTYPE html`, or `<svg` when an image/PDF was claimed.
- **PDF active-content check** — reject PDFs containing `/JavaScript`, `/JS`, `/Launch`, `/EmbeddedFile`, or `/OpenAction`.
- **Size caps** — cover 5 MB, PDF 50 MB, video 500 MB.
- **Filename sanitisation** — never trust the original name; store as `{uuid}.{validated-ext}` (already the pattern) and keep the display name sanitised through the existing `sanitizeText`.

## 3. Enforce it server-side too

Client validation can be bypassed, so the same checks are enforced where the file lands:

- Set **bucket-level `allowed_mime_types` and `file_size_limit`** on `group-media`, `courses-content`, `advisor-avatars`, `advisor-covers` and `kyc-documents`. Every bucket currently has both unset, so anything of any size gets through today.
- Extend the existing `course-content-scan` edge function to also verify each module's stored object: fetch its head bytes with the service role, re-run the magic-byte and active-content checks, and refuse to move the course to `pending_review` if a file fails.

## 4. Apply the guard everywhere files are uploaded

Creator Studio (cover, lessons), advisor avatar and banner, group display photo, and KYC document upload — all routed through the same `uploadGuard` with the appropriate profile, plus clear inline error messages instead of raw storage errors.

## Technical notes

- Storage policy changes and bucket MIME/size limits go through a database migration; bucket settings use the storage bucket tool, not raw SQL.
- No changes to the SEBI compliance vault access rules — only its size/type limits are tightened.
- Verification: sign in as a creator in a headless browser, upload a valid cover + PDF + MP4 (expect success), then attempt an SVG, a renamed `.exe`, and a JavaScript-bearing PDF (expect clean rejections).
