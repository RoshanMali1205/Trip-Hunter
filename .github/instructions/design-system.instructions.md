---
description: 'Use when: implementing any UI component, styling, theming, or visual element. Reference Trip Hunter design tokens for colors, typography, buttons, forms, surfaces, and layout.'
applyTo: '**/*.{scss,sass,css,html,component.ts,page.ts}'
---

# Design System — Trip Hunter

Source of truth: `src/styles/_tokens.scss` (CSS variables `--th-*`).
Light theme is default; dark theme uses `:root[data-theme='dark']`.

Font Family:

- Display / headings: `var(--th-font-display)` → **Sora**
- Body / UI: `var(--th-font-body)` → **Manrope**

Never introduce Inter, Roboto, Arial, or system-only stacks for branded surfaces.
Never default to purple-on-white or purple-to-indigo themes.

---

## Color Palette

### Primary Colors

| Token | CSS var | Hex (light) | Usage |
|-------|---------|-------------|-------|
| Primary | `--th-primary` | `#ff6a1a` | CTA, links, selected states, brand accent |
| Primary dark | `--th-primary-dark` | `#e85a0f` | Hover / pressed primary |
| Primary light | `--th-primary-light` | `#ff8f4a` | Soft highlights |
| Accent | `--th-accent` | `#ff6a1a` | Accent mirrors primary |
| Accent soft | `--th-accent-soft` | `rgba(255,106,26,0.12)` | Chip / soft fill |
| Teal | `--th-teal` | `#14b8a6` | Secondary travel accent |
| Text | `--th-text` | `#14181f` | Headings, body |
| Text secondary | `--th-text-secondary` | `#4b5563` | Supporting copy |
| Text muted | `--th-text-muted` | `#6b7280` | Meta, captions |
| Text inverse | `--th-text-inverse` | `#ffffff` | On primary / dark media |

### Surfaces

| Token | CSS var | Usage |
|-------|---------|-------|
| Page background | `--th-bg` | App canvas (`#eef2f8` light) |
| Elevated | `--th-bg-elevated` | Raised panels |
| Surface | `--th-surface` | Glass panels |
| Surface strong | `--th-surface-strong` | Stronger glass |
| Surface muted | `--th-surface-muted` | Quiet sections |
| Border | `--th-border` | Soft edges |
| Border strong | `--th-border-strong` | Stronger dividers |
| Input background | `--th-input-bg` | Form fields |

### Alert Colors

| Token | CSS var | Hex (light) |
|-------|---------|-------------|
| Success | `--th-success` | `#16a34a` |
| Warning | `--th-warning` | `#ca8a04` |
| Error | `--th-error` | `#dc2626` |
| Info | `--th-info` | `#0ea5e9` |

### Gradients & Atmosphere

| Token | CSS var | Usage |
|-------|---------|-------|
| CTA | `--th-gradient-cta` | Primary buttons |
| CTA soft | `--th-gradient-cta-soft` | Soft CTA washes |
| Hero | `--th-gradient-hero` | Media overlays |
| Page | `--th-gradient-page` | Full-page atmosphere |
| Pattern | `--th-pattern` | Subtle dot texture |

Prefer page gradients / glass surfaces over flat single-color backgrounds.

---

## Typography

| Level | Guidance | Font |
|-------|----------|------|
| Hero / brand | Large display, brand-first | Sora (`--th-font-display`) |
| Page title | Strong but secondary to brand on marketing surfaces | Sora |
| Section heading | One purpose per section | Sora |
| Body | Readable UI copy | Manrope (`--th-font-body`) |
| Meta / caption | Muted secondary | Manrope |

Use `var(--th-text)`, `var(--th-text-secondary)`, `var(--th-text-muted)` for color.

---

## Radii, Shadow, Blur

| Token | CSS var | Value (light) |
|-------|---------|---------------|
| Radius sm | `--th-radius-sm` | `12px` |
| Radius | `--th-radius` | `18px` |
| Radius lg | `--th-radius-lg` | `26px` |
| Shadow | `--th-shadow` | Soft elevated glass shadow |
| Shadow sm | `--th-shadow-sm` | Lighter elevation |
| Blur | `--th-blur` | `blur(18px) saturate(160%)` |

Layout chrome:

- Sidebar width: `--th-sidebar-width` (`260px`)
- Header height: `--th-header-height` (`64px`)

---

## Buttons

- Prefer existing `ButtonComponent` (`src/app/shared/components/button/`) when available
- Primary CTAs use `--th-gradient-cta` / `--th-primary`
- Avoid rounded-full pill clusters and multi-layer neon glows
- Keep button text English in templates (no i18n library)

---

## Forms & Inputs

- Background: `var(--th-input-bg)`
- Border: `var(--th-border-strong)`
- Focus: primary / accent soft ring — match nearby forms
- Labels and placeholders are English product copy

---

## Cards & Surfaces

- Default: **no cards** for marketing/hero compositions
- Cards are allowed when they contain a user interaction (trip list item, poll option, expense row)
- Prefer glass surfaces (`--th-surface`, `--th-blur`) over heavy boxed chrome
- If removing border/shadow/radius does not hurt interaction, it should not be a card

---

## Motion

- Prefer 2–3 intentional motions (scroll reveal, soft fade, hero presence)
- Reuse `ScrollRevealDirective` / existing motion patterns when present
- Respect reduced-motion when nearby code already does

---

## Icons

- Material Icons via `MatIconModule`
- Color with `--th-text*` or `--th-primary` — do not invent a second icon set

---

## Dark theme

When editing dark-aware styles, read the `:root[data-theme='dark']` block in
`src/styles/_tokens.scss` and use the same `--th-*` variables (values swap automatically).

---

## Rules for agents

- Always prefer `var(--th-*)` over raw hex in new SCSS
- Match nearby page SCSS structure before inventing new layout systems
- Do not introduce purple-indigo AI-default themes
- Do not flatten marketing heroes into dashboard card grids
