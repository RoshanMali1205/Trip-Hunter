---
description: 'Use when: creating or editing component styles (LESS, SCSS, or CSS), responsive layout, spacing, alignment, or visual fixes.'
applyTo: '**/*.{less,scss,sass,css}'
---

# Style Conventions

## Preprocessor

Read `PROJECT-CONVENTIONS.md` and `angular.json` to determine the project's preprocessor:

- **LESS** — `.less` files
- **SCSS** — `.scss` files
- **CSS** — `.css` files
- **Tailwind** — utility-first, with minimal custom CSS

Do NOT mix preprocessors. New style files must use the project's standard.

## Component-Scoped Styles

- Prefer component-scoped styles over global overrides
- Use Angular's `ViewEncapsulation.Emulated` (default) — styles are auto-scoped
- Avoid `::ng-deep` unless overriding UI library internals — add a comment explaining why

## Avoid

- `!important` — only use as last resort for UI library overrides, with a justification comment
- Deep fragile selectors (`.parent > .child > .grandchild > .target`)
- Duplicate or conflicting CSS rules in the same file
- Dead/unused selectors
- Commented-out style blocks
- Hardcoded pixel dimensions for responsive elements — prefer `%`, `vw/vh`, `flex`, or `calc()`

## Responsive Design

- Use the project's layout directives in templates (e.g. `@angular/flex-layout`, Bootstrap utility classes, Tailwind responsive prefixes)
- For preprocessor media queries, follow existing breakpoint patterns in the project
- Test at mobile (360px), tablet (768px), laptop (1024px), and desktop (1440px+)
- Account for overflow, wrapping, scroll, and text truncation

## Spacing & Alignment

- Follow existing spacing patterns in nearby components
- Prefer CSS `gap` for flex containers over individual margins
- Keep vertical rhythm consistent across sibling components

## UI Library Theming

- Override UI library component styles via the recommended overrides for that library
- For `::ng-deep` overrides, scope them to the component's selector to avoid leaks
- Global theme overrides go in the project's global stylesheet

## Maintainability

- Group related properties together (position, display, sizing, spacing, typography, color)
- Prefer Trip Hunter CSS variables (`var(--th-primary)`, `var(--th-surface)`, etc.) over raw hex
- Keep selector nesting to 3 levels maximum
- Reference `.github/instructions/design-system.instructions.md` and `src/styles/_tokens.scss`
- Do not introduce purple-indigo default AI themes; keep the coral / teal travel look
