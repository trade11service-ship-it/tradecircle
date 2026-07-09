Based on the selected direction — **Trust Monogram**, **Balanced Navy/Emerald palette**, **Premium Indian fintech mood** — this plan delivers a complete logo system for RA Circle.

### Phase 1 — Generate 3 logo concepts
Create three polished, high-resolution PNG logo variants:
- Variant 1: **Classic Trust Seal** — RA initials inside a single circular ring, navy ring with emerald RA and a subtle gold/white accent.
- Variant 2: **Layered Badge** — RA monogram with concentric circles and a small checkmark/shield motif, balanced navy and emerald.
- Variant 3: **Modern Crest** — Geometric RA mark inside a rounded shield-cum-circle, premium gradient depth, navy-led with emerald dot.

All variants will be designed on clean white/transparent backgrounds so they work on the current light theme and any future dark mode.

### Phase 2 — Favicon and asset pack
Once a variant is approved, produce:
- `logo.png` (full color, ~1024×1024)
- `logo-dark.png` (white/green version for dark surfaces)
- `favicon.ico` and `apple-touch-icon.png`
- Upload to Lovable CDN via `lovable-assets` and replace any existing placeholders.

### Phase 3 — Wire the logo across the app
Update the following components to use the new logo asset:
- `src/components/Navbar.tsx` — logo mark in the nav bar
- `src/components/Footer.tsx` — footer wordmark
- `index.html` — favicon and apple-touch-icon
- `supabase/functions/auth-email-hook/index.ts` — email header logo

### Phase 4 — Consistency verification
Check that:
- Logo renders cleanly on mobile and desktop
- No "R" / "RA Circle" / "TradeCircle" text-only fallbacks remain in key brand surfaces
- Favicon loads correctly in browser tab
- Email template header shows the new logo

### Deliverables
- 3 logo concept PNGs for review
- Final favicon/logo asset pack
- Updated brand surfaces in Navbar, Footer, index.html, and email templates

Approve this plan to proceed with generating the logo concepts.