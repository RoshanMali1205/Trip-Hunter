---
description: 'Use when: creating or editing Angular components and pages, lifecycle hooks, Signals, or component architecture decisions.'
applyTo: '**/*.{component.ts,page.ts}'
---

# Angular Component Conventions — Trip Hunter

## Project Pattern

- **Standalone only** for new code (`standalone: true`)
- Lazy routes via `loadComponent` / `loadChildren`
- Prefer `inject()` over constructor injection
- Prefer Signals (`signal`, `computed`) for local UI state
- File naming: pages as `*.page.ts`; shared widgets as `*.component.ts`
- Selector prefix: `app-` (e.g. `app-dashboard-page`)
- Styles: SCSS with `styleUrl: './name.page.scss'` (singular) unless nearby files differ

## Lifecycle & Patterns

- Prefer `inject()` + field initializers over heavy constructors
- For RxJS subscriptions, use `takeUntilDestroyed()` or explicit cleanup
- Avoid introducing OnPush unless matching an existing nearby component

## Dependencies

- Reuse `TripStore`, `TripApiService`, `AuthService`, toast, and feature API services
- Do not create parallel stores for trip data
- English UI strings are allowed (no i18n library)

## UI Libraries

- Angular Material + Trip Hunter glass tokens (`--th-*`)
- Prefer shared `ButtonComponent` for primary actions when nearby pages use it

## Style & Formatting

- Max line length ~100 (Prettier)
- Import RxJS operators from `'rxjs'`
- Do not mass-reformat unrelated files
