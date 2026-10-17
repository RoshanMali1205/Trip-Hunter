# Claude Code Project Memory — Trip Hunter

Trip Hunter uses the **Angular Multi-Agent Kit** adapted for this full-stack app
(Angular 22 SPA + Express `/api/v1` + Supabase). Read these files first whenever
starting a new task:

1. **`PROJECT-CONVENTIONS.md`** (project root) — locked-in stack and product rules.
2. **`AGENTS.md`** — Cursor Cloud / local run gotchas (Node version, demo mode, Buddy).
3. **`.github/instructions/design-system.instructions.md`** — Trip Hunter design tokens.
4. **`README.md`** and **`docs/architecture/overview.md`** — product surface and layers.
5. **2–3 files near the planned change** — copy existing patterns.

## Available Agents

When orchestrating end-to-end work, invoke `@angular-orchestrator`. For single-purpose tasks, invoke directly:

- `@angular-planner` — break down requirements, identify impacted files, define ACs
- `@angular-implementer` — write TS/HTML/SCSS (SPA) and, when needed, Express modules
- `@angular-ui-styling` — polish layout, responsive, visual fidelity with `--th-*` tokens
- `@angular-figma-reviewer` — design compliance audit (when a design exists)
- `@angular-unit-test-generator` — generate Vitest specs
- `@angular-test-fixer` — fix failing tests (specs only)
- `@angular-reviewer` — code review
- `@buddy-india-advisor` — Buddy / India trip advisor specialist

## Available Skills

- `sonar-check` — quality / lint analysis (repo has no ESLint; still check for smells)
- `conventional-commit` — commit message generation
- `explain-module` — analyze a module/feature area
- `run-test-suite` — execute and parse `npm test` / server build results
- `scaffold-component` — generate a standalone component scaffold

Cursor-native skill (also present):

- `.cursor/skills/buddy-india-trip-planner/SKILL.md` — India itinerary playbook helper

## Available Prompts

In `.claude/prompts/`:

- `plan-feature.prompt.md`
- `review-changes.prompt.md`
- `generate-missing-angular-specs.prompt.md`

## Feature-Specialist Agents

See `PROJECT-CONVENTIONS.md` → "Feature-Specialist Agents". Delegate to
`@buddy-india-advisor` when work touches Buddy chat, Gemini persona, or India itineraries.

## Hard Rules

- Prefer standalone + Signals + `inject()` for new Angular code
- Never modify production source when generating tests
- Never introduce new npm packages without explicit approval
- Never switch the project's component pattern (stay standalone)
- Do not introduce an i18n library — English copy in templates is intentional
- Always use `--th-*` design tokens for brand colors
- Always read `PROJECT-CONVENTIONS.md` first
- For API work, preserve the `/api/v1` success/error envelope
- Run SPA + API as two processes; use login shell (`bash -lc`) for Node/Angular CLI in Cloud
