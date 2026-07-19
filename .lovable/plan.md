## Plan: Production Fixes for Emails, Advisor Media, Branding, and Group Layout

### Already completed
- Repaired the backend advisor-approval routine so future approved advisor applications enqueue an RA Circle approval email through the verified `notify.racircle.in` sender instead of the old external mail path.
- Confirmed the sender domain is verified and the platform email setup is complete.

### 1. Make advisor approval emails reliably deliver
- Update the advisor approval email function to use the same verified RA Circle email infrastructure instead of the old SendGrid-only code path.
- Keep audit logging intact so each approval records whether the email is queued, sent, or failed.
- Verify the queue processor can pick up transactional approval emails.

### 2. Fix advisor profile photo upload and add banner upload
- Update the Profile page for advisor accounts:
  - Add avatar upload on the profile picture.
  - Add cover/banner upload on the profile header.
  - Validate file type and size before upload.
  - Save uploaded URLs back to the advisor record securely, scoped to the logged-in advisor.
- Make the uploaded advisor avatar/banner visible on public advisor pages and group detail pages.

### 3. Replace old placeholder branding globally in the app shell
- Replace the hardcoded “R” badge in the desktop sidebar and mobile header with the official RA logo component.
- Keep the current RA Circle wordmark text beside the logo.

### 4. Rebuild the desktop Group/Channel detail layout
- Keep the existing functionality but make the desktop layout stable and non-overlapping:

```text
Desktop /group/:id
┌───────────────┬────────────────────────────┬──────────────────────────────┐
│ App Sidebar   │ Group / Advisor Info       │ Live Signals / Chat Feed     │
│ Navigation    │ Stats, SEBI, Subscribe     │ Full-height scrollable feed  │
└───────────────┴────────────────────────────┴──────────────────────────────┘
```

- Remove redundant desktop back links from the group info/feed area.
- Keep the feed as the only scrollable area for messages.
- Preserve the mobile locked chat-style layout with its subscribe CTA.
- Prevent height compression, blank pull gaps, and panel overlap.

### 5. Validate after implementation
- Run the relevant app checks after code changes.
- Verify the changed pages visually with the browser:
  - `/group/:id` desktop layout.
  - `/profile` advisor avatar/banner controls.
  - Sidebar/mobile header logo.
- Confirm no new frontend errors appear in the console.

### Technical notes
- Backend email migration is already applied successfully.
- Remaining frontend/function edits require switching from plan mode to build mode before I can write files.
- I will not change payment behavior, auth flow, or unrelated pages in this pass.