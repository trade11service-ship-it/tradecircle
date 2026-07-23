## What the user is reporting

1. **Nav shows up inconsistently.** Some pages have the top mobile header, others don't; users want ONE persistent nav pattern (sidebar on desktop, bottom bar on mobile).
2. **Where should a returning user land?** Rule needs to be more nuanced than "signed in → dashboard":
   - Guest → Landing (`/`)
   - Signed-in trader with **zero active subscriptions** → public Home feed (`/`) — same page a guest sees, just personalized. They are NOT sent to a dashboard.
   - Signed-in trader **with ≥1 active subscription** AND returning after a long absence → their subscribed-groups feed at `/feed`.
   - Same user doing an **in-session refresh** → stays on whatever page they're on. No forced redirect.
   - Advisor / Admin → their existing dashboards on cold entry only.
3. **Trader "dashboard" at `/home` is broken and poorly named.** Rename it to `/feed` ("Your Feed"). Kill the "Live Public Feed" section that renders `₹0/₹0/₹0` broken text-post cards. Lead with subscribed-group signals.
4. **Investor vs Trader role choice at signup** needs to be explicit.

---

## Fixes

### 1. Unify navigation

- **Desktop:** sidebar in `AppLayout` = single nav. Nav items: **Home**, **Discover**, **Feed** (signed-in trader only, replaces "Dashboard"), **Profile**.
- **Mobile:** same items in the fixed bottom bar inside `AppLayout`. Persistent on every app-shell page. Group pages (`/group/*`) keep their own chat header and hide the bottom bar (correct today).
- **Delete** `src/components/BottomNavigation.tsx` — it's an unused duplicate of the bottom bar already inside `AppLayout`.
- Keep the marketing `Navbar` only on truly public marketing pages (`/about`, `/contact`, `/login`, `/register`, legal pages). The Landing page (`/`) uses `AppLayout` so it has the same unified nav for everyone.

### 2. Landing rule (corrected)

The `/` route decides what to render based on **who** is visiting and **how** they arrived:

| Who | On `/` cold visit (new tab / returned after a while) | Mid-session (in-app refresh) |
|---|---|---|
| Guest | Landing marketing + public feed preview | same |
| Signed-in trader, 0 active subs | Landing/public Home feed (personalized greeting, CTAs to Discover) | stays where they are |
| Signed-in trader, ≥1 active subs | `/feed` (their subscribed-group signals) | stays where they are |
| Advisor | `/advisor/dashboard` | stays where they are |
| Admin | `/admin` | stays where they are |

**"Cold visit" detection:** simple `sessionStorage` flag `ra_session_started`. If unset → cold visit, run the routing rule and set the flag. If set → user is mid-session, no forced redirect from `/`. This way refreshing a page never bounces the user to the dashboard; only opening the site fresh (new tab, cleared session, closed browser, deep-link back to `/`) triggers the smart landing.

Trader with zero subscriptions is treated as a guest for landing purposes — they see the public feed and marketing sections. No forced push into a dashboard for someone who hasn't paid for anything yet.

### 3. Rename `/home` → `/feed` and rebuild it

- Route rename: `/home` → `/feed`. Add a redirect from `/home` → `/feed` so old links don't break. Update all `navigate('/home')` and `<Link to="/home">` occurrences (`AppLayout.tsx`, `Dashboard.tsx`, `BottomNavigation.tsx` if kept, `Login.tsx` post-auth, `Register.tsx` post-auth).
- Nav label: **"Feed"** (icon: `Radio`), not "Dashboard" — this is subscriber content, not an ops dashboard.
- **Feed content order** (subscribed users only):
  1. Compact hero row: greeting + 4 KPIs (Active Groups, Today's Signals, Followed Advisors, Status).
  2. **My Groups** — horizontal chip row of subscribed groups with unread dot.
  3. **Latest signals from your groups** — main feed, WhatsApp-style bubbles like `GroupFeed.tsx`. Signals first, then general posts.
  4. **Followed advisors' public updates** — collapsible.
  5. **Live Public Feed section: REMOVED for subscribed users.** It only adds noise and duplicates.
- **Zero-subs fallback:** if a user manually navigates to `/feed` without any subscription, show a clean empty state with a `Discover advisors` CTA — don't render the broken public feed here.

### 4. Fix broken `₹0 / ₹0 / ₹0` cards everywhere

Rendering guard applied in `Home.tsx` (new `/feed`), `PublicMixedFeed.tsx`, `Explore.tsx`:
- If `post_type !== 'signal'` OR `entry_price` is null/0 → render the message text bubble.
- Never render the Entry/Target/SL three-column grid for text posts or empty-price signals.

### 5. Investor vs Trader choice at signup

- Add a **role selector step 0** in `Register.tsx`: two cards — "I'm an Investor / Trader" (→ standard signup, `role='trader'`, `user_type='investor'` or `'trader'`) and "I'm a SEBI-registered Analyst" (→ redirect to `/advisor-register`).
- Add optional `profiles.user_type text check (user_type in ('investor','trader'))` for personalization only. No permission or RLS change.
- Landing hero CTAs split into two clear entry points so the choice is visible before signup.

---

## Technical details

- **Files edited:** `src/App.tsx` (route rename + redirect + smart landing on `/`), `src/pages/Landing.tsx` (personalized signed-in variant + subscription check), `src/pages/Home.tsx` → rename to `src/pages/Feed.tsx` and rebuild, `src/components/AppLayout.tsx` ("Feed" label + `Radio` icon + path), `src/pages/Dashboard.tsx` (redirect targets), `src/pages/Login.tsx` + `Register.tsx` (post-auth redirect to `/feed` only if user has subs, else `/`), `src/pages/Register.tsx` (role picker step), `src/components/PublicMixedFeed.tsx` + `src/pages/Explore.tsx` (text-post rendering guard).
- **Files deleted:** `src/components/BottomNavigation.tsx`.
- **DB migration:** `alter table public.profiles add column user_type text check (user_type in ('investor','trader'))`. Backfill existing rows to `'trader'`. No RLS change.
- **Realtime / auth:** untouched.
- **Verification:** Playwright screenshots for guest, trader-with-zero-subs, trader-with-subs, advisor at `/`, `/feed`, `/discover`, `/group/:id`, `/register` on mobile (390×844) and desktop (1280×800) confirming: one nav, correct cold-visit landing, no forced redirect on refresh, no `₹0` cards.

Awaiting your approval to implement.