# TradeCircle Launch-Readiness Plan

Goal: take the app from "MVP that mostly works" to "production-ready, trust-first marketplace" that can onboard 2–3 SEBI advisors immediately and absorb 10–20k traders without breaking.

I'll execute this in 4 sequential phases. Each phase is independently shippable.

---

## Phase 1 — Stop the bleeding (auth, payments, core flows)

Without these working, no advisor or trader can transact. This is launch-blocker #1.

1. **Auth pipeline**
   - Audit `Login.tsx` / `Register.tsx` / `AdvisorRegister.tsx` / `ResetPassword.tsx` end-to-end on both email+password and Google OAuth.
   - Fix the recurring `refresh_token_not_found` (visible in auth logs) by clearing stale sessions on 400 and not auto-redirecting logged-out users into protected routes.
   - Ensure `handle_new_user` trigger fires for OAuth signups and that role (`trader` vs `advisor`) is set correctly at signup (currently advisors signing up via `/register` then `/advisor-register` can end up with `role='trader'` forever).
   - Add a single `/dashboard` route that smart-redirects: trader → `/home`, advisor → `/advisor/dashboard`, admin → `/admin`.

2. **Payment pipeline (Razorpay)**
   - Audit `initiate-payment`, `razorpay-webhook`, `create-payment-link` edge functions:
     - Webhook signature verification is missing — add HMAC check using `RAZORPAY_WEBHOOK_SECRET`.
     - Webhook GET callback uses `SUPABASE_URL` to guess frontend origin — replace with stored origin from `initiate-payment` (pass through `notes.origin`).
     - Move subscription creation to webhook only (don't trust client `/payment-success` redirect).
   - Add `payments` audit table (id, user, group, amount, razorpay_payment_id, status, raw_payload) for reconciliation.
   - Verify earnings trigger `record_subscription_earning` actually fires and computes 30% vs 15% (referral) correctly.

3. **`/payment-success` page**
   - Show real subscription status by polling `subscriptions` for ~10s (covers webhook delay).
   - Clear messaging for "pending", "active", "failed" states + manual "Contact support" CTA.

4. **Referral pipeline sanity check**
   - Verify referral cookie → `referral_signups` → `subscription.from_referral=true` → 15% fee actually flows through.
   - Add referral link generation in advisor dashboard if missing (group-scoped + advisor-scoped codes).

**Deliverable:** A trader can sign up, subscribe, pay, get added, and the advisor sees revenue. End-to-end smoke test passes.

---

## Phase 2 — Trust & differentiation layer (UI/UX rebuild of public surfaces)

The user's exact complaint: "looking typical old style AI made website." This is the conversion killer.

1. **New visual identity pass** (kept inside existing Navy/Green tokens but elevated):
   - Replace generic hero with a *proof-first* hero: live ticker of recent verified signals, "Verified by SEBI INH-XXXXX" badges, real advisor faces.
   - Add an "How we're different from Telegram" comparison strip (Telegram vs TradeCircle table: deletable signals vs immutable, anonymous vs SEBI-verified, etc.).
   - Editorial typography: pair a distinctive display font (e.g. Fraunces / Instrument Serif) for headlines with Inter for body — current single-font feels generic.
   - Trust band: STREZONIC PVT LTD, CIN, SEBI disclaimer, "₹47,000 Cr lost in fake channels — we exist to stop that" stat.

2. **Unified shell** so every page feels like one product:
   - Single `PageShell` wrapping Landing, Explore, AdvisorProfile, GroupDetails, Home with consistent header, nav, footer, spacing scale, container width.
   - Kill duplicate nav (`Navbar.tsx` vs `BottomNavigation.tsx` vs `BottomNav.tsx`) — keep one desktop nav + one mobile bottom nav.

3. **Onboarding & CTA funnel** (Trader):
   - Landing → "Browse verified advisors" (primary) / "I'm an advisor" (secondary).
   - Advisor profile → sticky "Subscribe ₹X/mo" with trust badges underneath.
   - Subscribe → 3-step modal (PAN → MITC consent → Pay) with progress bar.
   - Post-pay → "You're in" screen with Telegram join CTA + first signal preview.

4. **Onboarding funnel (Advisor)**:
   - Dedicated `/for-advisors` landing with revenue calculator (slider: subs × price → "You'd earn ₹X/mo at 70%").
   - 4-step KYC with progress, autosave, clear "what happens next" after submit.
   - Approval email + dashboard tour on first login.

**Deliverable:** Pages feel like one cohesive premium product, not a Lovable template. Conversion-ready funnel.

---

## Phase 3 — Scale-readiness for 10–20k users

Currently the app does naive `SELECT *` everywhere. Won't survive load.

1. **DB & RLS audit**
   - Add indexes on `signals(group_id, created_at desc)`, `subscriptions(user_id, status)`, `group_follows(user_id)`, `signals(advisor_id, post_type, result)`.
   - Review every RLS policy for `SELECT 1 FROM advisors WHERE ...` patterns — convert to `SECURITY DEFINER` helper functions to avoid per-row planner cost.
   - Confirm Realtime is enabled only on `signals` (not everything) to limit fan-out.

2. **Frontend perf**
   - Paginate the public feed (`PublicMixedFeed`, `/explore`, `Home`) — currently fetches unbounded.
   - Add React Query caching on advisor stats RPC (currently re-fetched on every nav).
   - Lazy-load admin + advisor dashboard routes.
   - Image optimization: store advisor avatars/covers via Supabase Storage transforms (resize + WebP).

3. **Edge function hardening**
   - Add Zod validation on every function body.
   - Rate limit `initiate-payment` (1/min/user) via simple in-memory or DB counter.
   - CORS lock to known origins, not `*`.

4. **Observability**
   - Add structured logs in webhook + payment functions (already partially there).
   - Add a `/admin/health` page showing today's signups, payments, failed webhooks.

**Deliverable:** Loads in <2s on 3G, no N+1 queries, can absorb a marketing push without 500s.

---

## Phase 4 — Live-pressure features (public feed + advisor ops)

What advisors and traders actually do day-to-day during market hours.

1. **Public feed (free 3 signals + blurred rest)**
   - Confirm the "3 free, rest blurred" logic is consistent across `Home`, `Explore`, `AdvisorProfile`.
   - Add "F&O auto-public after 24h" cron (currently relies on RLS time check — verify).

2. **Advisor quick composer (already started)**
   - Polish: instrument autocomplete (NSE symbol list), validation (entry/target/SL numeric, SL on correct side of entry), shortcut to mark TGT_HIT/SL_HIT.
   - Realtime push to subscribers' `/home` feed via Supabase Realtime channel.

3. **Telegram delivery**
   - Verify `send-telegram-signal` fires on every advisor post, handles failures, retries.
   - Subscriber onboarding: 3-step Telegram link flow (already exists — QA it).

4. **Reconciliation & payouts**
   - Admin view of pending advisor payouts (net earnings ≥ ₹500 threshold).
   - Export CSV for manual bank transfer (until payout automation is built).

**Deliverable:** Advisor posts a signal → trader sees it in app + Telegram within seconds → result marking flows into stats → earnings update.

---

## Cross-cutting

- **Security scan:** run `security--run_security_scan` after Phase 1 + Phase 3.
- **Legal:** confirm MITC text, refund policy, and immutable acceptance trail are wired into every paywall.
- **Mobile QA:** every flow tested on 360px width (most Indian retail traders are on budget Android).

---

## What I need from you before I start building

1. **Phase order** — proceed Phase 1 → 4 as above, or you want a different priority (e.g. visual redesign first to start advisor outreach)?
2. **Visual direction** — for Phase 2 should I generate 2–3 prototype directions (hero + advisor profile) for you to pick, or just rebuild based on your existing Navy/Green palette?
3. **Razorpay webhook secret** — do you have one configured at Razorpay dashboard? If not, I'll guide you to set it up and add `RAZORPAY_WEBHOOK_SECRET` via the secrets tool.
4. **Test advisor account** — give me one real advisor profile (or a test INH) so I can run the full subscribe→pay→deliver loop end-to-end.

Once you answer these, I'll start Phase 1 immediately.
