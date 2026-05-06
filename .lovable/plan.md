## Scope
Adds the items from your message on top of the previous polish plan. No DB schema change required — the `referral_links (advisor_id, group_id)` unique constraint already enforces "one permanent link per group". Everything else is app-layer logic + UI.

---

## 1. Admin Dashboard

**Sidebar — line ~605 in `AdminDashboard.tsx`:**
- Rename "Go to User App" → "Go to Website", `navigate('/home')` → `navigate('/')`.
- Add a second link right above it: "View Public Site (new tab)" → `window.open('/', '_blank')` so admin can preview live site without losing admin session.

**Make admin "Dashboard" tab their personal home:**
Replace the current overview-heavy Dashboard tab with:
- **Profile card** (avatar, name, email, edit-name inline button → updates `profiles`).
- **My Stats — This Month**: total platform fee earned (sum of `platform_fee` from `advisor_daily_earnings` for current month, all advisors), # active subs, # new advisors approved, # signals posted.
- **History panel**: month-by-month bars from `advisor_daily_earnings`. The 30-day rolling window for any single advisor starts from that advisor's *first group creation date* (`MIN(groups.created_at) WHERE advisor_id = X`), not from sign-up — applied via a small `firstGroupDateByAdvisor` map.
- The big "all advisors / pending / payments" tables stay in their own tabs (unchanged routing).

**Referral admin control (existing Referrals tab):**
- Add an "Edit Code" button beside each row → opens dialog → updates `referral_links.referral_code` (admin-only RLS already allows update). UI prevents code collision via existing unique index.
- Show creator (advisor) and lock indicator: "Permanent — only admin can edit".

---

## 2. Advisor Dashboard

**Stats / revenue (lines ~235–325 of `AdvisorDashboard.tsx`):**
- Strict active subs: `s.status === 'active' && new Date(s.end_date) > now`.
- **Remove GST cut** from displayed numbers per your instruction. New formulas the dashboard uses for display:
  ```
  gross         = sum(amount_paid)
  is_referral   = subscriptions.from_referral === true  // already on row
  platform_pct  = is_referral ? 15 : 30                  // from subscriptions.platform_fee_percent
  platform_cut  = gross * platform_pct/100
  advisor_net   = gross - platform_cut                   // no GST deduction in UI
  ```
  All math runs client-side over `subscribers` rows so it updates live with the existing realtime channel.
- Stats card "Your Earnings" → **Rolling 30-day Net** (filter subs by `created_at >= now - 30d`). Sub-label shows "Last 30 days" + small lifetime value below.
- New revenue breakdown table (Revenue tab): per group → Direct subs / Referral subs / Direct revenue / Referral revenue / Platform fee (15% vs 30%) / Your net. Toggle "Live" pill that flashes green on every realtime insert.

**Realtime feed:**
- Existing `advisor-subs-realtime` channel already refetches on new sub. Extend it to also listen for `signals` inserts on the advisor's groups so the in-dashboard feed updates without reload.

**WhatsApp-style sticky poster** (Post tab, lines ~422–591):
- Group Feed becomes the primary scrollable area; Post Update / Post Signal buttons collapse into a sticky bottom bar (`sticky bottom-14 md:bottom-0`, `pb-[env(safe-area-inset-bottom)]`).
- Tapping opens existing message/signal forms inside a `Sheet` slide-up. All posting logic untouched.

**Referral link rules (key change):**
- On `createGroup` success → auto-insert a referral_link row (one permanent code) immediately. Function already calls payment-link edge fn; chain a `referral_links.insert` after.
- `ReferralLinkCard.tsx`: remove "Get Referral Link" generation path for groups that already have one. Show the existing code only with copy/share/QR. No regen button. Add a small note: "Permanent code. Contact admin to change."
- Backfill: for existing groups without a referral row, auto-create on first dashboard load (one-shot per group) so every group ends up with exactly one code.

**Loading polish:**
- Replace page spinner with skeleton blocks (welcome bar + 4 stat cards + tab strip).
- `transition-transform hover:scale-[1.02] active:scale-95` on stat cards/buttons.
- `animate-in fade-in duration-300` on tab content wrapper.

---

## 3. Landing / Home hero

**Remove the secondary CTA "List as Advisor"** in the hero (lines 137–143 of `Landing.tsx`). Keep one primary CTA: "Browse Advisors". (Advisor onboarding stays accessible via Footer + dedicated `/advisor-register` route — still discoverable, just not in hero noise.)

**Better animated hero element** — replace the single auto-scroll marquee with a **"Live Tape" component**:
- Three vertically stacked rows scrolling at different speeds (top: BUY signals, middle: target-hit results, bottom: SELL signals), each row a horizontal infinite scroll using `animate-marquee` with offset `animationDelay`.
- Each card: advisor avatar + name, instrument, BUY/SELL chip, entry/target/SL, and a green/red pulse dot on hit results. Clean trader-language ("Entry", "Target", "SL", "P/L %").
- Pause on hover. Falls back to a static grid if `publicSignals.length < 3`.

**Featured advisors shuffle / fit:**
- `fetchFeaturedAdvisors` currently filters `is_public_featured=true`. Update to also include the **top approved advisors** (by subscriber count) when fewer than 8 are featured, so the section always shows 4–8 cards.
- Order: first by `public_sort_order ASC` then a stable daily-seeded shuffle (`new Date().toDateString()` as seed) so order rotates day to day but is consistent within a day.
- Filter chips above the grid: `All / F&O / Equity / Intraday / Swing / Options` — filters the list client-side using `strategy_type` (matches whatever the advisor selected in their dropdown). "All" is default.
- Responsive grid: 1 col mobile, 2 col sm, 3 col lg, 4 col xl. Cards have fixed min-height so 4–8 always fit cleanly without ragged rows.

---

## 4. Advisor onboarding gate (verify existing)

Already correct in code: `AdvisorRegister.tsx` line 106 explicitly leaves `role='trader'` until admin approval, and the admin approve action flips both `advisors.status='approved'` and `profiles.role='advisor'`. The plan adds:
- On `/advisor/dashboard` load, if `advisors.status !== 'approved'`, render a clear pending screen with: "Application under review. You currently have full trader access." + button to `/dashboard`. Hide all advisor tools until approved.
- Make sure Navbar/BottomNav decide the "Dashboard" link off `profile.role` (already does via `getDashboardPath`) — no change, just double-checked.

---

## 5. Bottom nav clearance
Add `pb-14 md:pb-0` to Advisor + Admin main wrappers so the new sticky poster + page bodies clear the mobile BottomNavigation. `safe-area-bottom` is already applied inside the nav.

---

## Files touched
- `src/pages/AdminDashboard.tsx`
- `src/pages/AdvisorDashboard.tsx`
- `src/pages/Landing.tsx`
- `src/pages/AdvisorRegister.tsx` (small — pending screen text)
- `src/components/AdminReferralTab.tsx` (edit-code dialog)
- `src/components/ReferralLinkCard.tsx` (lock to single permanent code)

## Out of scope
- DB schema, RLS, edge functions (none need changing — `referral_links` unique key already enforces one-per-group; `subscriptions.platform_fee_percent` and `from_referral` already populated by the payment flow).
- GST trigger logic in `record_subscription_earning` — kept intact for record-keeping; only display side hides GST.
