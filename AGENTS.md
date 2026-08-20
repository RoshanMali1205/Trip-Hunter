# AGENTS.md

## Cursor Cloud specific instructions

Trip Hunter is an Angular 22 SPA (`src/`) plus an Express `/api/v1` server (`server/`).
Standard setup, scripts, routes, and env vars are documented in `README.md`; only the
non-obvious cloud gotchas are captured here.

### Node version (important gotcha)
- Angular CLI 22 refuses to run on the base image's `/exec-daemon/node` (v22.14.0); it
  requires Node >= 22.22.3. An nvm-managed Node 22 is installed and set as the nvm
  `default`, and `~/.bashrc` pins that nvm Node ahead of `/exec-daemon/node` on `PATH`.
- Because of this, always run `npm`/`ng`/`node` from a login shell so the correct Node is
  used. tmux sessions started with `bash -l` already do this. For one-off commands use
  `bash -lc '...'`. A bare non-login `node`/`npm` may still resolve to the too-old
  `/exec-daemon/node` and Angular commands will error.

### Running the app (two processes, both in demo mode by default)
- API: `npm run server:dev` (tsx watch) → http://localhost:3000. With no Supabase env
  vars it reports `auth=mock data=memory` and accepts any email + 6+ char password.
- SPA: `npm start` (`ng serve`) → http://localhost:4200. `proxy.conf.json` forwards
  `/api` to the API on :3000, so the API must be running for create/read calls to work.
- Health check: `curl -s http://localhost:3000/api/v1/health`.
- Demo mode needs no secrets. To use real data, set `SUPABASE_URL` + keys in `.env` (see
  `README.md`); do not commit secrets.

### Lint / test / build
- No ESLint is configured. Prettier is the formatter but is not wired as an npm script;
  run `npx prettier --check`/`--write` manually. The repo currently has many pre-existing
  Prettier diffs — do not mass-reformat unrelated files.
- Tests: `npm test` runs Vitest once via `@angular/build:unit-test` (not watch). One
  pre-existing spec (`src/app/app.spec.ts`) fails under jsdom because `window.matchMedia`
  is not implemented; this is unrelated to environment setup.
- Build: `npm run build` (SPA, prod) and `npm run server:build` (`tsc` for the API) both
  succeed. The prod SPA build emits a non-fatal component-style budget warning.

### Buddy (India trip advisor)
- In-app chat: floating **Ask Buddy** control in the authenticated shell. Runtime prompt:
  `server/src/modules/advisor/buddy-persona.ts`. Needs `GEMINI_API_KEY` for live replies.
- Team playbook (itineraries, seasons, budget bands): `docs/buddy/india-trip-playbook.md`.
- Cursor skill for agents helping with Buddy / India trip planning:
  `.cursor/skills/buddy-india-trip-planner/SKILL.md`. Use it when editing Buddy or when
  the user wants an India itinerary explained in Trip Hunter terms.
