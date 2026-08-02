## What exists today (verified)

- Creator Studio **already exists** at `/creator-studio` (courses, new course, earnings & payouts tabs) — but there is **no navigation link to it anywhere**, so creators can only reach it by typing the URL. That's the "no dashboard for course creators" problem.
- The bottom nav's third slot is role-swapped in `AppLayout.tsx`: advisors see "Dashboard" (`/advisor/dashboard`), admins see "Admin", everyone else sees "Feed" (`/feed`). So yes — the slot already converts by role; creators were simply never added to that switch.
- Payout KYC today is **not** required to use the Studio. The `creator-kyc-verify` function only lets a creator verify PAN/bank **after an admin approves at least one of their courses**. So: create + upload freely → admin approves → KYC unlocks → money can be paid out.

## Answers to your questions

1. **Will the dashboard convert for a course seller?** Yes — that's what this plan does. One slot, role-aware: Advisor → advisor dashboard, Admin → admin, Creator → Creator Studio, Trader → Feed.
2. **Does the seller need KYC to get access?** No. Access to the Studio is immediate on registering as a creator. KYC is a **payout gate**, not an access gate: upload → admin review → approval → KYC unlock → payouts. That's the safer order and I'd keep it.

## Plan

**1. Role-aware "Dashboard" slot**
- Add creator detection in `AppLayout` (look up `creator_profiles` for the signed-in user, cached in auth context so it doesn't refetch on every nav).
- Priority: admin → advisor → creator → trader. Creator gets a "Studio" entry pointing to `/creator-studio`.
- If a user is both advisor and creator, keep the advisor dashboard in the nav and add a "Creator Studio" link inside the account dropdown.

**2. Nav order**
New bottom-bar order: **Home → Courses → Dashboard → Public feed → Discover**. The Dashboard label is dynamic ("Dashboard" for advisor, "Studio" for creator, "Feed" for trader, "Admin" for admin).

**3. Creator Studio gets a real dashboard tab**
Add an "Overview" tab as the Studio's landing view with:
- Stat cards: total courses, live/approved, under review, drafts, total students, gross sales, net earnings, pending payout balance.
- KYC status banner with the exact next step (verify payouts / awaiting course approval / rejected + reason).
- Recent sales list and quick actions (New course, Add lesson, Verify payouts).
- Existing Courses / New course / Earnings tabs stay unchanged.

**4. Route + redirect polish**
- `/dashboard` smart redirect learns the creator case → `/creator-studio`.
- Signed-in creators landing on `/` cold get sent to the Studio, matching how advisors are handled.
- Non-creators hitting `/creator-studio` see the existing "become a creator" onboarding, not an error.

### Technical notes
- Creator lookup added once in `src/lib/auth.tsx` (`creatorId`, `creatorKycStatus`) so `AppLayout`, `Dashboard.tsx`, `SmartLanding.tsx`, and Creator Studio all read the same value.
- Overview stats come from `courses`, `course_purchases`, and `creator_payout_ledger`, scoped by `creator_id` — read-only, no schema changes and no new RLS policies needed.
- Bottom bar stays at 5 items to avoid crowding on mobile.
