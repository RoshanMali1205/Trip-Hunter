# GitHub Copilot — Trip Hunter

Trip Hunter is an Angular 22 SPA (`src/`) plus an Express `/api/v1` server (`server/`),
with Supabase Auth/Postgres and Netlify hosting. Use the Angular Multi-Agent Kit
conventions when suggesting or editing code.

## Always read first

1. `PROJECT-CONVENTIONS.md` — stack decisions (standalone, Signals, SCSS, Vitest, no i18n)
2. `.github/instructions/*.instructions.md` — file-type coding standards
3. Nearby files in the same feature folder — match patterns exactly

## Stack defaults

- **Angular**: standalone components, `loadComponent` / `loadChildren`, `inject()`, Signals
- **Styles**: SCSS + CSS variables `--th-*` from `src/styles/_tokens.scss`
- **UI**: Angular Material + custom glass travel UI
- **Tests**: Vitest via `npm test`
- **API**: Express modules under `server/src/modules/`, envelope `{ success, data | error }`
- **Auth**: Bearer Supabase JWT; demo mode when Supabase env vars missing

## Do

- Prefer editing existing services (`TripStore`, `*-api.service.ts`) over new ones
- Keep selectors prefixed with `app-`
- Use `styleUrl` (singular) for new components unless nearby files differ
- For Buddy / India advice, follow `.cursor/skills/buddy-india-trip-planner/SKILL.md`
  and `server/src/modules/advisor/buddy-persona.ts`

## Don't

- Don't add NgModules for new features
- Don't add ESLint/i18n libraries or new npm packages without an explicit ask
- Don't hardcode brand colors — use `--th-primary`, `--th-bg`, etc.
- Don't commit secrets or put `SUPABASE_SERVICE_ROLE_KEY` in browser code
- Don't mass-reformat Prettier-only diffs

## Useful paths

| Area | Path |
|------|------|
| Routes | `src/app/app.routes.ts`, `src/app/features/trips/trips.routes.ts` |
| Trip API client | `src/app/core/services/trip-api.service.ts` |
| Trip store | `src/app/core/services/trip.store.ts` |
| Design tokens | `src/styles/_tokens.scss` |
| API docs | `docs/api/README.md` |
| Buddy playbook | `docs/buddy/india-trip-playbook.md` |
| Multi-agent kit | `docs/multi-agent-kit/README.md` |
