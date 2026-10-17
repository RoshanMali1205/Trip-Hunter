# Project Conventions — Trip Hunter

> Filled for this repository. Every multi-agent kit agent reads this first before
> auto-detection. Keep this file accurate when stack decisions change.

---

## Project Identity

- **Project name**: Trip Hunter
- **Repository**: https://github.com/RoshanMali1205/Trip-Hunter
- **Brief description**: Collaborative office-team trip planning (voting → itinerary → bookings → budget → expenses → settlement) with an Angular SPA, Express `/api/v1` API, Supabase Auth/Postgres, and Buddy (Gemini India trip advisor)

---

## Angular Stack

- **Angular version**: `22`
- **Component pattern**: `standalone` (preferred for all new code)
- **Lazy loading**: `loadComponent` (pages) and `loadChildren` (trip feature routes)
- **Change detection**: `Default` (do not force OnPush unless the nearby file already uses it)
- **DI style**: `inject()` preferred over constructor injection for new code
- **Reactivity**: Angular Signals (`signal`, `computed`, `effect`) preferred for new UI state; RxJS for HTTP streams

---

## Style & UI

- **Style preprocessor**: `SCSS`
- **UI library**: Angular Material `^22` + custom glass / travel UI (`src/styles/_tokens.scss`)
- **Layout system**: CSS Flexbox / CSS Grid (no Bootstrap, no `@angular/flex-layout`)
- **Icon library**: Material Icons via `MatIconModule`
- **Component selector prefix**: `app-`
- **Directive selector prefix**: `app`
- **Style binding**: `styleUrl` (singular) for new components; match nearby files
- **Design tokens**: CSS variables `--th-*` in `src/styles/_tokens.scss` — always use tokens, never hardcode brand colors

---

## Internationalization (i18n)

- **i18n library**: `None` (English UI copy is written directly in templates/TS)
- **Hardcoded strings allowed**: `Yes — English product copy is the standard`
- Do **not** introduce `@ngx-translate`, Transloco, or `$localize` unless explicitly requested

---

## Testing

- **Test framework**: `Vitest` via `@angular/build:unit-test`
- **Testing utilities allowed**: `Angular TestBed`, `jsdom`
- **Coverage tool**: Vitest / Angular unit-test builder defaults
- **Coverage target**: Meaningful coverage for new logic; no formal gate today
- **Test command**: `npm test` (single run, not watch)
- **Known flake**: `src/app/app.spec.ts` can fail under jsdom without `window.matchMedia` — unrelated to most feature work

---

## Code Quality

- **Linter**: `None` configured (no ESLint)
- **Formatter**: Prettier (`.prettierrc`) — do not mass-reformat unrelated files
- **Static analysis**: `None`
- **Max line length**: `100` (match Prettier / nearby code)
- **Max cognitive complexity per method**: `15`
- **Pre-commit hooks**: `None`

---

## State & Data

- **State management**: Signals + services (`TripStore`, feature API services)
- **HTTP client**: Angular `HttpClient` → `/api/v1` (proxied locally via `proxy.conf.json`)
- **API envelope**: `{ success: true, data }` / `{ success: false, error: { code, message } }`
- **Auth**: Supabase JWT Bearer token (demo mode accepts any email + 6+ char password when keys missing)
- **Date library**: `Native Date` + Angular `DatePipe`
- **Forms**: Template-driven (`FormsModule`) and Reactive Forms as used nearby — match the feature folder
- **Currency display**: INR via `InrCurrencyPipe` in `src/app/shared/pipes/format.pipe.ts`

---

## Architecture

- **Folder structure**:
  - `src/app/features/` — auth, dashboard, trips, explore, notifications, profile, misc
  - `src/app/core/` — auth, guards, interceptors, services, models, theme, PWA
  - `src/app/shared/` — reusable components, pipes, directives
  - `src/app/layout/` — authenticated app shell
  - `server/src/` — Express API modules under `/api/v1`
  - `supabase/migrations/` — Postgres + Storage
  - `docs/` — architecture, API, Buddy playbook, multi-agent kit
- **Shared components**: `src/app/shared/components/`
- **Core services**: `src/app/core/services/`
- **Models/interfaces**: `src/app/core/models/`
- **Naming convention for files**:
  - Pages: `*.page.ts` / `*.page.html` / `*.page.scss`
  - Components: `*.component.ts` (or feature-local names matching nearby files)
  - Specs: `*.spec.ts`
  - Server: `*.controller.ts`, `*.service.ts`, `*.repository.ts`

---

## Backend (Express API)

- **Runtime**: Node 22, `tsx` watch in `npm run server:dev`
- **Entry**: `server/src/index.ts`
- **Modules**: `server/src/modules/{trips,planning,bookings,budgets,tasks,documents,approvals,notifications,advisor,...}`
- **Auth middleware**: `server/src/middleware/authentication.ts`
- **Data modes**: Supabase (live) or in-memory demo when env keys missing
- **Buddy prompt**: `server/src/modules/advisor/buddy-persona.ts` (needs `GEMINI_API_KEY`)
- When a feature spans UI + API, plan both sides and keep envelope / error codes consistent

---

## External Integrations (Optional MCP Servers)

- [ ] **Azure DevOps MCP**
- [ ] **Jira MCP**
- [x] **GitHub MCP** — issues / PRs when available in the agent environment
- [ ] **Figma MCP**
- [ ] **Confluence MCP**
- [ ] **Slack MCP**
- [x] **Cursor Cloud** — cloud agent diagnostics when running in Cursor Cloud

---

## Things to Avoid

- Do not add new npm packages without explicit approval
- Do not introduce NgModules for new features (standalone only)
- Do not introduce a second UI library alongside Angular Material for the same widget
- Do not hardcode brand colors — use `--th-*` tokens from `src/styles/_tokens.scss`
- Do not commit secrets (`.env`, Supabase service role, `GEMINI_API_KEY`)
- Do not put `SUPABASE_SERVICE_ROLE_KEY` in browser code
- Do not mass-reformat Prettier diffs unrelated to the task
- Do not invent bank/UPI settlement integrations — mark-paid only exists today
- Do not expand Buddy beyond India travel advice without an explicit request

---

## Feature-Specialist Agents

- `buddy-india-advisor` — Buddy chat, India itineraries, Gemini persona, playbook alignment
- Cursor skill (parallel): `.cursor/skills/buddy-india-trip-planner/SKILL.md`
