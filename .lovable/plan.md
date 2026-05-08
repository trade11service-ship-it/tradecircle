## Goal
Fix the 4 critical bugs first, then upgrade the group header and advisor profile so traders can size up an advisor at a glance — with stats competitors don't show.

---

## Phase 1 — Critical Bug Fixes

### Bug A — Back navigation loops between Group ↔ Advisor Profile
Root cause: the mobile back button in `src/pages/GroupDetails.tsx` is a `<Link to="/advisor/...">` (push), not a real history pop. So Group → "back" pushes Profile, then Profile → browser back returns to Group.

Fix:
- Replace the Link with a real button that calls `navigate(-1)` if there is history, else `navigate('/home')` for logged-in users / `/` for guests.
- Use `location.key !== 'default'` to detect whether there is a back entry.
- Apply the same logic to `src/pages/AdvisorProfile.tsx` (add a top-left back button with the same fallback).

### Bug B — White/blank gap at the bottom of the group page
Root cause: `GroupDetails` is `absolute inset-0` inside `AppLayout`'s scroll area, but `AppLayout` also renders a sibling 60px placeholder below the scroll area whose `bg-transparent` exposes the parent's `bg-muted/30`. On the group page the chat input ends slightly above the safe-area inset, making a visible band.

Fix in `src/components/AppLayout.tsx`:
- When the route is `/group/*`, skip the bottom placeholder and let the scroll area extend the full height; the fixed bottom nav already overlays correctly.
- Add `pb-[60px]` (bottom-nav height) inside `GroupFeed`'s scroll list so the last message isn't hidden.
- Ensure the chat container uses `h-full` not `min-h-full` to avoid extra empty rows.

### Bug C — Signal cards hard to read on new background
The slate background I introduced is still too close to `bg-card` white.

Fix in `src/components/GroupFeed.tsx`:
- Change feed background to a warmer, slightly darker tone (`bg-[#E7EBF0]` light / `bg-[#0B141A]` dark).
- Bump bubble shadow to `shadow-[0_2px_6px_rgba(0,0,0,0.08)]` and border to `border-border/80`.
- For BUY bubbles: solid `bg-[hsl(140,55%,94%)]` with `border-l-4 border-l-primary`.
- For SELL bubbles: solid `bg-[hsl(0,70%,95%)]` with `border-l-4 border-l-destructive`.
- Increase price-row text to `text-[13px] font-bold` and use `text-foreground` (was muted).

### Bug D — Group/Advisor card overflows viewport on Listed Advisors page
Visible in screenshot 1: card extends past the right edge with a horizontal scrollbar.

Fix in `src/pages/ListedAdvisors.tsx`:
- Wrap each card row in `min-w-0` and set the card to `w-full max-w-full overflow-hidden`.
- Replace any `whitespace-nowrap` on tagline/bio with `truncate` / `line-clamp-2`.
- The strategy/years/since badge row needs `flex-wrap gap-2` so it never forces width.
- Add `overflow-x-hidden` to the page `<main>` as a safety net.
- Audit `src/pages/Discover.tsx` Row-1 (avatar + name + price tag) the same way — on 320px the price chip is `shrink-0` and pushes the name container; switch the price chip to a 2nd line on `<sm` screens.

### Other layout issues found while auditing (will fix in same pass)
- `AdvisorProfile` — contact phone/email row can overflow when long; add `truncate` and `min-w-0`.
- `Discover` — stats `grid-cols-4` gets cramped under 360px; switch to `grid-cols-2 sm:grid-cols-4`.
- Group header subscribe button can collide with title on 320px; wrap title in `min-w-0 truncate`.
- Profile menu in `BottomNavigation` — long emails overflow; add `truncate`.

---

## Phase 2 — Group Header Profile Button + Inline Stats

In `src/pages/GroupDetails.tsx` chat header:
- The avatar + group name area becomes a single tappable Link to `/advisor/:id` (already partly done — will polish).
- Add a small "Profile" pill button on the right (next to Subscribe) with `User` icon → opens advisor profile cleanly (not via back).
- Under the group name, replace the current single line with a 3-chip stat strip:
  `📊 {signal_count} signals  •  ✅ {accuracy}%  •  🎯 {years}y exp`
- On 320px these collapse to a horizontal scroll strip.

---

## Phase 3 — Advisor Profile Redesign

Rebuild `src/pages/AdvisorProfile.tsx` with a premium, transparent layout. Dark hero on top, glass cards below, big numbers with small labels (Bloomberg-meets-mobile).

### Sections (top → bottom)

**1. Hero / Identity**
- Cover gradient + avatar with verified ring
- Name, SEBI reg pill, market specialization tags (from `strategy_type` split)
- Years experience, short bio, "Active since {created_at year}"

**2. Headline Stats Row** (large numbers, mobile horizontal scroll)
- Total signals (all time)
- Win rate % with mini breakdown `W / L / BE`
- Followers + 7-day growth arrow

**3. Performance Deep-Dive** (the differentiator — competitors don't show these)
| Metric | Source |
|---|---|
| Avg Risk:Reward | derived from `(target - entry) / (entry - stop_loss)` across signals |
| Avg signal duration | avg of `result_set_at - created_at` (will add column or compute from result update timestamp; for now use `created_at → updated_at` proxy) |
| Best month return % | grouped win-rate per month, pick max |
| Current streak | consecutive WIN or LOSS run from latest signals |
| Accuracy by market condition | tag signals by index trend on signal_date (Phase 3.5 — needs a small RPC; placeholder shown as "Coming soon" if data unavailable) |
| Signals per week | `total_signals / weeks_active` |
| Max drawdown % | longest losing streak × avg loss size (proxy until P&L tracked) |

All metrics will be exposed via a single new SECURITY DEFINER RPC `get_advisor_extended_stats(_advisor_id)` so the UI stays fast and RLS-safe.

**4. Trust & Transparency strip**
- "All signals immutable & timestamped" badge
- Risk level: Conservative / Moderate / Aggressive (auto-derived from avg R:R and signal frequency)
- Markets traded (from groups' `strategy_category`)
- Active hours (derived from `mode(extract(hour from created_at))` of signals)

**5. Recent Signals Strip**
- Last 5 signals as small chips: instrument · BUY/SELL · result icon

**6. Trading Channels** (kept from current page, restyled to match)

### Visual direction
- Background: `bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950` for hero, `bg-background` for body
- Cards: `bg-card/60 backdrop-blur border border-border/60 rounded-2xl`
- Numbers: `text-4xl font-extrabold tracking-tight`, labels: `text-[10px] uppercase tracking-widest text-muted-foreground`
- Single accent color: existing `--primary` green; no rainbow

---

## Files to change

- `src/pages/GroupDetails.tsx` — back nav, header, stats chips, profile button
- `src/pages/AdvisorProfile.tsx` — full redesign + back button
- `src/pages/ListedAdvisors.tsx` — overflow fix
- `src/pages/Discover.tsx` — small overflow + grid fix
- `src/components/GroupFeed.tsx` — bg, bubble contrast, bottom padding
- `src/components/AppLayout.tsx` — drop the placeholder for `/group/*`
- `src/components/BottomNavigation.tsx` — truncate long email
- New SQL migration — `get_advisor_extended_stats(_advisor_id uuid)` RPC

---

## Order of execution
1. Bug A, B, C, D + small layout audits (no schema changes)
2. Group header upgrade
3. Advisor profile redesign (UI first using existing stats)
4. Add the extended-stats RPC and wire the deep-dive metrics

After step 1 you'll see the immediate fixes; steps 2–4 are progressive enhancements.
