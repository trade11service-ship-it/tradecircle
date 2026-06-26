# Recolor RA Circle — Slate / Sky / Emerald

Swap the current Midnight Navy + Emerald system for the requested modern palette. All changes are token-level so every page (Landing, Explore, Group, Advisor Dashboard, Admin, Auth, Footer, Navbar) updates instantly with no per-component edits.

## New palette mapping

| Role | Hex | Token |
|---|---|---|
| Primary surface / headers / nav / footer | `#1F2937` Dark Slate Grey | `--primary`, `--sidebar-background`, `--navy` |
| Secondary / links / CTAs / highlights | `#0EA5E9` Sky Blue | `--secondary`, `--accent`, `--ring` |
| Success / SEBI verified / status only | `#10B981` Emerald | `--success`, `--emerald` (new, restricted use) |
| Base background | `#FFFFFF` White | `--background`, `--card`, `--popover` |
| Text | `#1F2937` on white, `#FFFFFF` on slate | `--foreground`, `--*-foreground` |
| Borders / muted | Slate-200/500 | `--border`, `--input`, `--muted`, `--muted-foreground` |
| Destructive | `#EF4444` Crimson (kept) | `--destructive` |

## Files touched

1. **`src/index.css`** — rewrite `:root` and `.dark` HSL token values to the palette above. Update gradient helpers (`tc-gradient-hero`, `tc-gradient-cta`, `tc-border-glow`, glow keyframes) to use slate→sky instead of navy→emerald. Keep typography, radius, spacing, animations unchanged.
2. **`tailwind.config.ts`** — repoint the `navy`, `emerald`, `crimson` aliases; add a `sky` alias for `--secondary`. No structural changes.
3. **Hardcoded leftovers sweep** — quick `rg` for `#0f172a`, `#10b981`, `bg-emerald`, `text-emerald`, `from-navy`, `to-emerald` in components (Navbar logo accent, Footer, AppLayout sidebar, DashboardHero, SignalCard, Explore hero, Landing hero) and swap to the new tokens (`text-sky-500` for the "Circle" accent, emerald reserved only for SEBI/verified/success badges in `TrustBadges`, `tc-badge-sebi`, advisor verified ticks).
4. **Logo accent** — "RA **Circle**" accent shifts from emerald to sky blue, since emerald is now reserved for verification only.

## Scope guardrails

- No layout, copy, routing, schema, or component-structure changes.
- Emerald usage restricted to: SEBI verified badge, KYC approved status, subscription active pill, signal "TARGET HIT" success state. Everything else previously emerald (buttons, links, logo, gradients) becomes sky blue.
- Dark mode tokens updated in parallel so the admin/group dark surfaces stay consistent.

## Preview after build

Once applied, you'll see: white canvas, dark slate headers/footer/sidebar, sky-blue primary buttons and "Circle" logo accent, emerald reserved for the SEBI verified chip and success states only. I'll also capture a Playwright screenshot of Landing + Explore + a Group page after the change so you can compare side-by-side.