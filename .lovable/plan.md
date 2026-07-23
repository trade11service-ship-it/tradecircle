## Execution Plan — UI/UX, Branding, Onboarding, Profile

Sequenced Design tokens → Global components → Page layouts → Features → DB.

---

### Phase 1 — Design tokens & brand system

**Files:** `src/index.css`, `tailwind.config.ts`

- Keep the existing Slate/Sky/Emerald tokens (already unified) but:
  - Audit `--muted-foreground` vs `--card` — bump muted text one step darker (`215 16% 40%`) so metric labels on white cards clear WCAG AA.
  - Tighten `--radius` from `1rem` to `0.625rem` for the "Linear/Stripe" feel; add `--radius-pill: 999px` for badges only.
  - Add semantic `--surface-1` / `--surface-2` for card layering instead of ad-hoc `bg-muted/50`.
- Remove usage of decorative gradients on structural surfaces (banners, cards). Keep gradients only for hero accents.
- Add a shared `<Icon>` sizing convention: `h-4 w-4` for inline metrics, `h-5 w-5` for nav.

### Phase 2 — Global components

**2.1 Navbar / AppLayout dedupe** — `src/components/AppLayout.tsx`, `src/components/Navbar.tsx`
- `Logo` already renders the full "RA CIRCLE" wordmark PNG. Remove the sibling `<span>RA Circle</span>` text next to it in AppLayout sidebar (line 58–60), AppLayout mobile header (137–139), and Navbar (44–45). Keep a single `<Logo />` with `sr-only` text for accessibility.

**2.2 Emoji → Lucide sweep** — grep-driven pass over:
- `src/components/GroupCard.tsx`, `SignalCard.tsx`, `PublicMixedFeed.tsx`, `InstagramPostCard.tsx`, `TrustBadges.tsx`, `DashboardHero.tsx`, `HeroSection.tsx`
- `src/pages/Discover.tsx`, `Explore.tsx`, `Landing.tsx`, `AdvisorProfile.tsx`, `GroupDetails.tsx`, `AdvisorDashboard.tsx`, `Home.tsx`
- Mapping: 📊 → `Activity`, ✅ → `CheckCircle2`, 👥 → `Users`, 📈 → `TrendingUp`, 🎯 → `Target`, 🔔 → `Bell`, ⚡ → `Zap`, 🛡️ → `ShieldCheck`, ⚠️ → `AlertTriangle`, 💰 → `IndianRupee`.

**2.3 Responsive scale primitives** — introduce in Tailwind:
- Standardize hero: `text-3xl sm:text-4xl md:text-5xl lg:text-6xl`.
- Standardize card metric: `text-lg md:text-xl`, label `text-[11px] md:text-xs`.
- Standardize buttons: `h-10 px-4 md:h-11 md:px-5`.
- Apply across `HeroSection.tsx`, `DashboardHero.tsx`, `GroupCard.tsx`, `Home.tsx`, `Landing.tsx`.

### Phase 3 — Page layouts

**3.1 Profile banner / avatar clipping** — `src/pages/Profile.tsx`
- Restructure header: outer wrapper `relative pb-16` (reserves avatar overhang), banner `h-32 md:h-44 rounded-b-2xl overflow-hidden`, avatar container `absolute -bottom-10 left-6 h-24 w-24 rounded-full ring-4 ring-background` — avatar sits **outside** the banner's `overflow-hidden` by being a sibling, not a child. Remove any `overflow-hidden` on the ancestor that wraps both banner + avatar.

**3.2 Mobile scaling passes** — apply Phase 2.3 tokens on `Landing.tsx` hero, `DashboardHero.tsx`, `Home.tsx` metric grid; ensure `container mx-auto px-4` on all pages to eliminate horizontal scroll leaks.

### Phase 4 — Onboarding & friction

**4.1 Consent modal micro-copy** — `src/pages/Login.tsx` (Google consent checkbox), `SubscriptionModal.tsx`, `Register.tsx`
- Rewrite copy around DPDP + SEBI trust: *"Your data is protected under India's DPDP Act 2023. We encrypt every session and never share your information with third parties. By continuing you agree to our Terms and Privacy Policy."*
- Keep underlying legal links unchanged; only reword the surface prompt.

**4.2 Guided tour** — new `src/components/QuickStartTour.tsx`
- Lightweight dismissible card (no external lib) rendered on `Home.tsx` for traders when `localStorage.ra_tour_dismissed !== '1'`.
- 3 steps: Discover advisors → Active groups → Accountability tracking. Each step is a static tile with icon (Lucide `Compass`, `Radio`, `LineChart`), title, one-line explainer, and a "Got it" dismiss.

**4.3 Delete account relocation** — `src/pages/Profile.tsx`
- Move delete action out of the primary Settings surface into a collapsed "Danger Zone" section at the bottom of the Security tab, styled with `border-destructive/30 bg-destructive/5`.
- Require the existing confirmation dialog **plus** a typed-confirmation ("type DELETE") before the destructive button enables.

### Phase 5 — Profile customization features

**5.1 Trader bio field**
- DB migration: add `bio text` to `public.profiles` (nullable, max length enforced client-side at 280 chars). No new RLS needed — existing profile policies already cover it. GRANT already exists.
- UI: add Textarea in Profile "Details" tab, visible for role `trader`; render on public trader profile if/when we add one (out of scope this pass — field only).

**5.2 Editable name & email**
- Inline "Full name" edit on Details tab (already partly present via `editing` state — polish to inline pencil UX).
- Email change: dedicated section in Security tab. Use `supabase.auth.updateUser({ email })` which triggers Supabase's built-in confirmation email flow to both old + new address. Show pending-verification banner until confirmed.

---

### Database migration (Phase 5.1 only)

```sql
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS bio text;
-- No new GRANT / policy needed; existing profile grants + RLS cover it.
```

No other schema or RLS changes required.

---

### Validation

- `tsgo` typecheck after each phase.
- Manual: incognito mobile 375px + desktop 1440px on `/`, `/home`, `/discover`, `/profile`, `/group/:id`, `/login`.
- Confirm: single logo, zero emoji in cards, avatar not clipped, delete gated, bio saves, email change sends verification.

Awaiting approval to switch to build mode.
