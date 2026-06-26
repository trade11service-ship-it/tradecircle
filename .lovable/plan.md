## Fixes

### 1. Brand consistency — "Circle" everywhere = sky blue
Audit found the navbar is the **only** place using emerald-green for "Circle". Every other page (Footer, AppLayout sidebar, mobile header, Register, Login, Profile, AdminDashboard, BottomNavigation) uses **sky blue**. The agreed palette also reserves emerald strictly for SEBI verification badges.

Fix: change navbar logo accent from `text-emerald` to `text-sky` in `src/components/Navbar.tsx` (lines 47 & 108-style "Get Started" button) so the brand reads **RA Circle** (white + sky-blue) on every page.

### 2. Hero section — remove unnecessary green
Current hero on `src/pages/Landing.tsx` has green leaking into:
- "Certified Advisors" text → switch to sky blue (matches the brand accent)
- Background radial gradient → drop the emerald glow, keep only a soft sky glow
- "Browse Verified Advisors" CTA → recolor from emerald to primary navy with sky accent
- Trust chips (Lock/Eye/BarChart3) → keep neutral muted text

Emerald will be reserved **only** for the "100% SEBI Verified" pill at the top and the literal SEBI ✓ verification badges on signal cards — exactly what the palette spec calls for.

### 3. Public Feed preview on homepage — trim to 3 tips
`src/pages/Landing.tsx` currently renders up to 6 sample cards. Change `.slice(0, 6)` → `.slice(0, 3)` and shrink the fallback array to 3 items, so the homepage shows just a quick taste of the latest 2–3 live tips, with the "Open Public Feed →" button doing the heavy lifting.

### 4. Cross-page sweep (sanity check, no other changes)
Verify no other component still uses `text-emerald` for the brand wordmark or as a generic primary accent. Confirmed clean except navbar; nothing else to edit.

---

### Files touched
- `src/components/Navbar.tsx` — recolor "Circle" to sky, change "Get Started" CTA from emerald to navy/sky
- `src/pages/Landing.tsx` — hero color cleanup + slice public feed preview to 3