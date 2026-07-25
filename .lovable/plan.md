## 1. Homepage — restore minimized Public Feed teaser

`src/pages/Landing.tsx`: Re-add a compact "Live public signals" section (5–6 latest items) using `PublicMixedFeed` in preview mode, with a "See full public feed →" link to `/explore`. Section sits between features and Featured Advisors.

## 2. Public Feed page (`/explore`) — chat-style, newest at bottom

`src/pages/Explore.tsx` + `src/components/PublicMixedFeed.tsx`:
- Reverse ordering so oldest is at top, newest at bottom (like a live group chat).
- On initial load and on every new realtime item, auto-scroll to bottom (only if user is already near bottom, so mid-scroll reading isn't hijacked).
- Keep the current list-row styling; just flip order + auto-stick behavior.
- Add a subtle "New signals ↓" pill when user has scrolled up and new items arrive.

## 3. Navigation restructure — bottom bar on desktop too, Profile out of nav

`src/components/AppLayout.tsx`:
- Remove the left desktop sidebar entirely.
- Use the same bottom nav on desktop and mobile (centered, max-width container, slightly taller on desktop).
- Nav items become exactly: **Home · Discover · Feed/Dashboard · Public Feed** (Profile removed).
- Add persistent top header (desktop + mobile) with Logo left, and Profile avatar + logout menu right. Guests see Sign in / Get started.
- Adjust main content padding-bottom for the new desktop bottom bar.

## 4. One-time DPDP consent (stop re-prompting on every login)

Problem: `Login.tsx` currently forces the Terms checkbox before every sign-in, even for returning users who consented at signup.

Fix:
- `Login.tsx`: Remove the mandatory checkbox from the login form. Login only authenticates; no consent capture.
- `Register.tsx` + Google sign-up path: keep the consent capture (already stored in `user_legal_acceptances` with `acceptance_type='general_terms'`).
- New guard: after any successful sign-in, `AuthProvider` checks `user_legal_acceptances` for a `general_terms` row. If missing (legacy/edge case), show a **blocking modal** (`ConsentGate.tsx`) that:
  - Cannot be dismissed (no close button, no outside-click, no ESC).
  - Requires ticking DPDP Act 2023 + Terms checkbox.
  - On "Agree & Continue" inserts the acceptance row and unlocks the app.
  - On refuse → signs the user out.
- Users who already have a stored consent see nothing — consent is asked exactly once, ever.

## 5. Restore advisor profile access

`src/pages/AdvisorProfile.tsx` route (`/advisor/:id`) already exists but isn't linked from Discover/Home for many entry points. Audit and wire:
- `Discover.tsx` / `GroupCard.tsx`: add a small "View advisor →" affordance on each group card that routes to `/advisor/:advisorId` (group click still opens the group).
- `GroupDetails.tsx` header: make advisor name/avatar clickable → `/advisor/:advisorId`.
- `PublicMixedFeed` rows: advisor name/avatar clickable → advisor profile.
- Keep existing group-focused navigation intact.

## Technical notes

- Consent lookup uses existing table `user_legal_acceptances` with `.eq('acceptance_type','general_terms').maybeSingle()` — no schema change.
- Realtime chat-style feed: use existing subscription in `PublicMixedFeed`; only ordering + a `scrollTop = scrollHeight` effect changes.
- Bottom-nav-on-desktop: single component path, no route changes; sidebar block deleted, header block added.
- No changes to payments, RLS, or edge functions.

## Out of scope

- No redesign of Feed/Dashboard/Group internals.
- No new tables or migrations.
