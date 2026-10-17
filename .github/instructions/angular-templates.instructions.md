---
description: 'Use when: creating or editing Angular HTML templates, page markup, Material usage, or UI copy.'
applyTo: '**/*.{component.html,page.html}'
---

# Angular Template Conventions — Trip Hunter

## Copy / i18n

Trip Hunter has **no i18n library**. Write clear English product copy directly in templates.
Do **not** introduce translate pipes, Transloco, or `$localize` unless explicitly requested.

## UI Component Libraries

- Prefer Angular Material (`mat-icon`, `mat-form-field`, dialogs, etc.) already used nearby
- Prefer shared components under `src/app/shared/components/` (`ButtonComponent`, trip cards, Buddy chat)
- Do not mix a second UI library for the same widget

## Layout

- CSS Flexbox / CSS Grid in component SCSS
- Use `--th-*` tokens for color, radius, shadow, blur
- Prefer glass surfaces over heavy card chrome unless the card wraps an interaction

## Template Best Practices

- Prefer Angular control flow (`@if`, `@for` with `track`) when nearby files already use it; otherwise match the folder
- Avoid heavy logic in templates — move to component TypeScript / Signals
- Preserve accessibility: semantic HTML, labels, `aria-*` where feasible
- Keep marketing / explore heroes brand-first and uncluttered (see design-system instructions)

## Shared Components

Before duplicating UI, check:

- `src/app/shared/components/button/`
- `src/app/shared/components/trip-card/`
- `src/app/shared/components/trip-advisor/`
- `src/app/shared/pipes/format.pipe.ts` (`InrCurrencyPipe`, `StatusLabelPipe`)
- `src/app/shared/directives/scroll-reveal.directive.ts`

## Icons

Use Material Icons: `<mat-icon>icon_name</mat-icon>`.
