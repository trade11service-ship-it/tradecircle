# RA Circle — Premium Redesign Plan

Goal: strip the AI-generated feel across every page. Move from "colorful marketing template" to "institutional fintech tool" (Zerodha Kite / Mercury / Stripe Dashboard). Restraint, density, consistency.

---

## Phase 1 — Design Token Reset (foundation for everything)

Rewrite `src/index.css` tokens. Every page inherits these — no per-page color overrides after this.

**Palette (solid only, no gradients anywhere):**
- `--background`: #FFFFFF
- `--surface-alt`: #F8FAFC (slate-50, alternating section bg)
- `--foreground`: #0F172A (slate-900, headlines)
- `--body`: #475569 (slate-600, body text)
- `--muted-foreground`: #94A3B8 (slate-400, metadata)
- `--border`: #E2E8F0 (slate-200, 1px everywhere)
- `--primary`: #0F172A (deep navy — buttons, headers)
- `--accent`: #059669 (emerald — SEBI/verification/success ONLY)
- `--destructive`: #DC2626 (crimson — sell/loss only)

**Type scale (locked):** 40/32/24/18/16/15/14/13/12/10. Inter only. Weights 400/500/600/700.

**Spacing/radius (locked):** radius 12px for cards, 10px for buttons, 999px for pills. Padding: card 24px, section 64px vertical.

**Global purge:**
- Remove every gradient: `.tc-gradient-hero`, `.tc-gradient-cta`, `.tc-gradient-text`, `.tc-border-glow`, gradient blob orbs, `animate-gradient-shift`, `animate-glow`, `animate-float-slow`, `animate-pulse-ring`.
- Remove `.tc-btn-primary` gradient → solid navy.
- Delete unused animation keyframes.

---

## Phase 2 — Shared Components (used by every page)

1. **`Logo.tsx`** — single monochrome navy lockup, no shadow variants.
2. **`Navbar` / `AppLayout` sidebar** — white bg, 1px slate-200 border, navy text, emerald dot only on active. No gradient sidebar.
3. **`PageHeader.tsx`** — white bg, left-aligned, 12px uppercase slate-500 eyebrow, 32px navy title, 15px slate-600 subtitle, optional pill row. No dark hero card.
4. **`Footer.tsx`** — slate-50 bg, 1px top border, 3-column dense layout, 13px slate-600.
5. **`Button` variants** — `primary` (navy solid), `secondary` (ghost, slate-200 border), `success` (emerald, verification only). Kill "premium" gradient variant.
6. **Trust pill** — reusable `<TrustPill icon label />` at 11px, slate-100 bg, slate-700 text, emerald icon.

---

## Phase 3 — Landing & Marketing Pages

**`Landing.tsx`** — hero per spec: white bg, no dark container, left-aligned max-w-[600px], eyebrow "India's first SEBI-only advisory marketplace", 40px headline with "Not random tips." in slate-400 line-through (not blue), 18px slate-600 subhead, navy "Browse advisors" + ghost "How it works", 4 trust pills row. Remove floating disclaimer.

**Features section** — 3-col grid, 24px Lucide line icons (strokeWidth 1.5), 16px bold title, 14px slate-600 body. No card containers, left-aligned.

**Featured advisors on landing** — use the new AdvisorCard (see Phase 4).

**`About.tsx`, `Contact.tsx`, `Disclaimer.tsx`, `Privacy.tsx`, `Terms.tsx`, `Refund.tsx`** — apply `PageHeader` + single-column max-w-[720px] prose. 15px slate-600 body, 24px slate-900 h2, 18px slate-900 h3, 1px slate-200 dividers between sections. No colored callout boxes except emerald "SEBI note" and amber "Risk warning" pills.

---

## Phase 4 — Advisor & Group Cards (used across Discover, Explore, Featured, Landing)

**`GroupCard.tsx`** rebuild per spec:
- 1px slate-200 border, 12px radius, 24px padding, no green left border.
- Header row: 40px avatar · name (15px/600) + emerald SEBI pill with reg no · right: price (16px/700) with "/quarter" (10px slate-400) beneath.
- Stats row: horizontal with vertical 1px slate-200 dividers between Signals · Accuracy · Members (13px slate-900 values, 11px slate-500 labels).
- Strategy tags: slate-100 bg pills, 11px slate-700.
- Description: 12px slate-600, no italics, line-clamp-2.
- Full-width navy CTA, 10px radius, "View group".

Apply the same card treatment to any advisor tile on `FeaturedAdvisors.tsx`, `ListedAdvisors.tsx`, `Discover.tsx`.

---

## Phase 5 — Public Feed / Explore

**`PublicMixedFeed.tsx` + `Explore.tsx`** → tight list view:
- Row: 28px avatar · name (14px/600) · emerald SEBI pill · right: real timestamp "2 min ago" (12px slate-400).
- Content: 13px slate-600, left-aligned, no italics.
- Remove "UPDATE" label, per-row "PII masked", "Live now" badge.
- One top note above list: "Subscriber data is masked end-to-end." (12px slate-500).
- 1px slate-200 divider between rows, no cards.
- Signal rows: inline BUY/SELL pill (emerald/crimson), entry/target/SL as mono numbers in a compact table.

---

## Phase 6 — Trader Experience

**`SmartLanding.tsx`, `Home.tsx` (feed), `Dashboard.tsx`** — dense subscriber feed:
- Sticky top bar: current group tabs (horizontally scrollable, 13px, active underline navy).
- Signal cards: 1px slate-200, 16px padding, BUY/SELL emerald/crimson pill, symbol in mono 15px/700, entry/target/SL as a 3-col mono grid, timestamp slate-400.
- Right rail (desktop only): "Your subscriptions" summary list — group name, next renewal date, alerts on/off toggle.

**`Subscriptions.tsx`** — table-style list: group · advisor · price · started · renews · status pill. No large cards.

**`Profile.tsx`** — sidebar tabs (Info · Subscriptions · Security · Following · Delete). Right pane: form fields with 1px slate-200 inputs, 10px radius, 15px text. Banner + avatar clipping fixed with `object-cover` + fixed aspect box. Trader bio textarea. Danger zone at bottom: red-outlined section with typed-DELETE gate.

**`Notifications.tsx`** — same list pattern as feed rows.

---

## Phase 7 — Advisor Dashboard

**`AdvisorDashboard.tsx`** — Mercury-style workspace:
- Left sidebar tabs (Signals · Groups · Subscribers · Earnings · Referrals · Audit · Profile), 13px labels, emerald active dot.
- Top KPI strip: 4 tiles (Active subs · MRR · Accuracy · Pending payout) — white, 1px slate-200, 24px padding, 12px slate-500 label / 24px slate-900 value / 12px emerald delta.
- Composer: white card, group selector, symbol input (mono, uppercase), BUY/SELL segmented control, entry/target/SL mono inputs, note textarea, primary navy "Post signal".
- Signals table: dense rows, mono numbers, status pill (Open · Hit target · SL hit).
- Group editor tab: same input treatment, "Save changes" primary navy.
- Earnings tab: dense table + CSV download button (ghost).

---

## Phase 8 — Advisor Public Profile & Group Details

**`AdvisorProfile.tsx`** — white hero: 96px avatar, name, emerald SEBI pill w/ reg no, follow button (ghost until followed → navy solid). Below: 4-stat strip, About/Groups/Feed tabs (underline nav), no gradient banner.

**`GroupDetails.tsx`** — locked 3-part flex (already stable). Header: white, 64px group photo, group name (20px/700), advisor sub-line (13px slate-500), emerald SEBI pill, right: price + Subscribe navy button. Sticky. Feed area: WhatsApp-style bubbles retained but restyle — slate-50 bg, white bubbles with 1px slate-200 border, emerald/crimson accents only on BUY/SELL and P&L.

---

## Phase 9 — Admin & Auth

**`AdminDashboard.tsx`** — same Mercury workspace shell (sidebar + KPI strip + tables). Approve/Reject actions as emerald/crimson ghost buttons.

**`Login.tsx`, `Register.tsx`, `ForgotPassword.tsx`, `ResetPassword.tsx`** — center card, max-w-[400px], 1px slate-200, 24px padding. Google button: white bg, slate-200 border, Google logo, "Continue with Google". Consent checkbox above button, 12px slate-600 DPDP copy. No gradient background.

---

## Phase 10 — QA Sweep

- Grep for hex colors and gradient utilities in `src/**` — every hit must resolve to a token or be removed.
- Grep for `bg-gradient`, `from-`, `via-`, `to-`, `backdrop-blur`, emoji glyphs in JSX — remove/replace with Lucide.
- Verify every page: same button radius (10px), same card radius (12px), same border color (slate-200), same section padding (64px).
- Check mobile viewport at 375px on Landing, Feed, GroupDetails, AdvisorDashboard, Profile — no overflow, no clipping.
- Confirm emerald appears ONLY on SEBI/verified/success; crimson ONLY on sell/loss/danger.

---

## Technical notes

- All color changes flow through `src/index.css` HSL tokens + `tailwind.config.ts`; no hardcoded hex in components.
- Delete `.tc-gradient-*`, `.tc-border-glow`, `.tc-btn-primary` gradient definitions; replace with solid utility classes.
- Keep component APIs stable — this is a visual pass, not a data/logic refactor. No DB changes.
- Realtime, auth, payments, RLS untouched.
- Order of execution: Phase 1 → 2 → 4 (cards land everywhere) → 3 → 5 → 6 → 7 → 8 → 9 → 10.

Estimated blast radius: ~40 files edited, 0 files deleted, 0 migrations.