# Plan — Home rework, premium blur, advisor stats, admin fixes

## 1. Home page (`/home`) — subscriber-first layout
File: `src/pages/Home.tsx`

When the logged-in user has at least one active subscription, restructure the page top-to-bottom as:

1. **Greeting card** (kept, slimmed — remove the 3 generic "Live posts / Subscriptions / Learning" tiles).
2. **My Groups** — horizontal scroll row of subscribed groups (avatar + name + unread dot). Tap → opens that group's feed.
3. **Latest from your groups** — most recent 5 signals/posts across all subscribed groups (compact cards, full content, tap → group). Live updated via realtime on `signals`.
4. **Public Feed (minimized)** — collapsed section header "Live Public Feed" + only 3 latest public/free posts + "See more on Explore →" link. Removes the heavy mixed-feed list currently rendered.

Non-subscribers keep current layout (greeting + Live Public Feed) but also get the simplified 3-item preview.

Add a small pill button at the top right of `/home` labeled **"Explore Home"** that routes to `/` (the marketing landing). Place next to the bell/Explore button.

## 2. Admin dashboard — fix "Go to Website"
File: `src/pages/AdminDashboard.tsx` (lines 603–618)

- Replace the broken `Open in new tab` button (which currently does `window.open('/', '_blank')` but is reported broken by the user — likely popup-blocked or sidebar-collapse stealing the click).
- Make a single working "Go to Website" button: `<a href="/" target="_blank" rel="noopener">` styled as the existing pill so the browser handles it natively (no JS popup).
- Keep the same icon and label.

## 3. Premium signal blur for non-subscribers in group page
Files: `src/components/GroupFeed.tsx`, `src/lib/accessControl.ts`

Current rule: first 3 posts visible to free, then lock overlay, then hidden.

New rule the user wants:
- Free / guest / logged-in non-subscriber: **all premium signals are visible but blurred** (numbers + entire price block obfuscated with frosted glass).
- Only active subscribers of that group see them clearly.
- F&O 24h public rule and `is_public` after-24h rule still apply (those become clear once the timer passes).
- Remove the "hide completely after 3rd" branch in `getPostVisibility`. Replace with: not subscribed → blur all premium; subscribed/owner → clear.
- Keep the "Subscribe to unlock" sticky CTA at top of feed for non-subscribers.

## 4. Advisor stats — make them advisor-driven and live
Files: `src/pages/AdvisorProfile.tsx`, `src/pages/AdvisorDashboard.tsx`, new SQL function.

### 4a. Remove from profile deep-dive
- ❌ Avg Risk:Reward
- ❌ Best Month
- (keep cards: Total Signals, Win Rate, Active Members, Followers, Signals/Week, Win Streak, Max Loss Streak, Active Hours, Risk Level, Audit Trail, Last 5 Signals)

### 4b. Auto-computed (no advisor input, real-time)
Computed via a new SECURITY DEFINER RPC `get_advisor_live_stats(_advisor_id)` returning:
- `total_signals` — count of `signals` where `post_type='signal'` (excludes `message`/posts).
- `win_count` / `loss_count` — `result IN ('WIN','LOSS')` (also accept new values `TGT1_HIT`, `TGT2_HIT`, `TGT_HIT` as wins; `SL_HIT` as loss).
- `win_rate` — wins / (wins + losses).
- `active_members` — distinct active subscribers across the advisor's groups (no caching).
- `followers` — count of `group_follows` rows across the advisor's groups (never decremented by us; only user can unfollow).
- `signals_per_week` — `total_signals / max(1, weeks_since_first_group_created)` using `groups.created_at MIN`.
- `current_win_streak`, `max_loss_streak` — derived from chronological resolved signals.
- `active_hours` — top hour-of-day bucket from `signals.created_at` (auto-derived; no manual override needed but we still let the advisor pin a "preferred trading window" — see 4c).

Frontend subscribes via Supabase realtime to `signals`, `subscriptions`, `group_follows` for the advisor's groups → re-runs RPC on change.

### 4c. Advisor-controlled fields (new "Public Profile / Stats" tab in Advisor Dashboard)
Add columns to `advisors`:
- `preferred_trading_hours text` (e.g. "09:30–11:00")
- `risk_level text` (enum: `Conservative | Moderate | Aggressive`) — stored as advisor's own pick, replaces auto-derive label.

UI in `AdvisorDashboard.tsx` → new "Public Profile" tab with simple form: Risk Level (dropdown), Preferred Trading Hours (text), Bio, Years Experience, Tagline. Save via update on `advisors`.

### 4d. Audit Trail card — keep as-is ("Immutable — entry/target/SL locked").

## 5. Mark signal result + auto-recompute
Files: `src/components/GroupFeed.tsx` (advisor view), migration on `signals.result`.

Currently `result` column accepts `PENDING/WIN/LOSS`. Extend allowed values to:
`PENDING | TGT1_HIT | TGT2_HIT | TGT_HIT | SL_HIT | WIN | LOSS`.

In group feed, when viewer is the owner advisor and signal is `PENDING`, show inline action row under the bubble:
`[ TGT Hit ] [ TGT1 Hit ] [ TGT2 Hit ] [ SL Hit ]`

Clicking updates `signals.result` (existing RLS allows advisor update). Stats RPC treats any TGT*_HIT as a win, SL_HIT as a loss → win rate / streaks update automatically. Realtime subscription on `signals` re-fetches stats so the change appears live on profile and dashboard.

## 6. Advisor Dashboard fine-tune & home/dashboard split
Files: `src/pages/AdvisorDashboard.tsx`, `src/components/AppLayout.tsx`, routing.

### Bug: advisor sees Home and Dashboard as the same page (footer connects both)
Today, when an approved advisor logs in, the bottom-nav "Home" tab and the dashboard route render essentially the same content because of how `AppLayout` and routing are set up.

Fix:
- For role=`advisor`, the bottom nav becomes 3 tabs: **Dashboard** (their workbench), **Groups** (list of their own groups), **Profile**. Remove the trader "Home/Discover/Profile" tabs for advisors.
- `/home` for advisors redirects to `/advisor/dashboard`.
- Add a top-right "Explore Home" pill on `AdvisorDashboard.tsx` that opens `/` in a new tab — same as the admin button.

### Bug: advisor can't open their own group
Investigation needed but likely: `GroupDetails` access check requires a subscription row, and the owner advisor has none. Fix: in `GroupDetails.tsx`, treat the user as full access if `auth.uid() === group.advisor.user_id`. (RLS already lets them read signals; this is just the client gate.)

### Quick post composer at bottom of group feed (advisor-only)
File: `src/components/GroupFeed.tsx`

For the owner advisor viewing their own group, render a sticky WhatsApp-style composer above the bottom-nav with:
- Text input ("Post update or signal…")
- Toggle: Post / Signal
- If Signal: 4 small fields appear inline (Instrument, Entry, Target, SL) + BUY/SELL pill + Send.
- If Post: just Send → inserts a `post_type='message'` row.

Non-advisor viewers don't see the composer.

### Bug: white blank gap inside group page (advisor side)
File: `src/components/AppLayout.tsx` (already partially fixed for traders)

The group page detection (`isGroupPage`) currently only suppresses bottom-nav padding for trader routes. For advisor route shape (`/advisor/group/:id` or wherever they land), the bottom-nav placeholder still reserves 60px → white gap. Extend `isGroupPage` regex to include advisor group routes and ensure the composer's own height (≈64px) is the new bottom padding instead.

## 7. Database migrations
- `ALTER TABLE advisors ADD COLUMN preferred_trading_hours text, ADD COLUMN risk_level text;`
- New RPC `get_advisor_live_stats(_advisor_id uuid) RETURNS json` (SECURITY DEFINER) — public-readable aggregate, no RLS needed.
- No change to `signals.result` column type (already text); just expand client-side allowed values.

## Files to touch
- `src/pages/Home.tsx` — subscriber-first layout, Explore Home pill
- `src/pages/AdminDashboard.tsx` — fix Go to Website button
- `src/pages/AdvisorDashboard.tsx` — Public Profile tab, Explore Home pill, ensure separate from /home
- `src/pages/AdvisorProfile.tsx` — remove Avg R:R + Best Month, switch to live RPC
- `src/pages/GroupDetails.tsx` — owner full-access fix
- `src/components/GroupFeed.tsx` — blur all premium for non-subs, advisor result-mark buttons, quick composer
- `src/components/AppLayout.tsx` — advisor group route gap fix, advisor-specific bottom nav
- `src/components/BottomNavigation.tsx` — advisor 3-tab variant
- `src/lib/accessControl.ts` — new visibility rule (blur-all instead of hide-after-3)
- New SQL migration

## Open questions before I implement
1. For advisor bottom nav, OK with **Dashboard / Groups / Profile** or do you want a different 3rd tab?
2. "Active members" — count distinct users across **all** advisor's groups, or per-group on the profile? (Plan assumes platform-wide for the advisor.)
3. Should the Explore-Home pill also appear in the advisor's mobile header, not just dashboard top?
