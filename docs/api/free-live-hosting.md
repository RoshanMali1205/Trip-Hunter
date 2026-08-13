# Free live hosting (no paid Node server)

Trip Hunter is designed so a small team can go live **without renting a VPS or paying for an always-on Node process**.

## What runs where (all free tiers)

```text
Team browsers
     │
     ▼
┌────────────────────────────────────────┐
│  Netlify (free)                        │
│  • Angular SPA  (static files)         │
│  • Express API  (Functions / serverless)│
│    path: /api/*  →  netlify/functions  │
└────────────────┬───────────────────────┘
                 │ only when a request hits /api
                 ▼
┌────────────────────────────────────────┐
│  Supabase (free)                       │
│  • Auth (JWT)                          │
│  • Postgres (migrations in repo)       │
└────────────────────────────────────────┘
```

| Piece | Host | Cost model | Do you pay for “server always on”? |
| --- | --- | --- | --- |
| Angular UI | Netlify static | Free tier | No — static CDN |
| Node/Express API | Netlify Functions | Free tier (request limits) | **No** — wakes only per API call |
| Auth + DB | Supabase | Free tier | No managed always-on bill beyond free quota |

You do **not** need Railway, Render, AWS EC2, DigitalOcean, etc. for this MVP.

## Why this works

- Locally you run `cd server && npm run dev` (long-lived process) for convenience.
- In production, the **same Express app** is wrapped by `serverless-http` in `netlify/functions/api.ts`.
- Netlify starts that function when someone calls `/api/v1/...`, then freezes it. No monthly Node host.

Free-tier limits are enough for a small office team testing the app. Heavy traffic later may need a paid plan — not required to get the team on a public URL.

## Two go-live levels

### Level A — Share the UI today (fastest)

1. Connect this GitHub repo to [Netlify](https://app.netlify.com).
2. Use existing `netlify.toml` (build publishes Angular + compiles `server/`).
3. Deploy. Share the `https://….netlify.app` URL.

The SPA already works with **localStorage mocks**, so teammates can click through login, dashboard, and trips. Each browser has its own mock data (not shared yet).

### Level B — Shared real data (still free)

1. Create a free [Supabase](https://supabase.com) project.
2. Run SQL in `supabase/migrations/` (in order) in the Supabase SQL editor, or `supabase db push`.
3. In Netlify → Site settings → Environment variables, add:

| Variable | Where it comes from |
| --- | --- |
| `SUPABASE_URL` | Project Settings → API |
| `SUPABASE_PUBLIC_KEY` | anon / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | service_role (server only — never put in Angular) |
| `NODE_ENV` | `production` |

4. Redeploy Netlify.
5. Check `https://YOUR_SITE.netlify.app/api/v1/health` — expect `"auth":"supabase"` and `"data":"supabase"`.

Until the Angular client is switched from localStorage to `/api/v1` + Supabase Auth, the UI still uses mocks; the API is live for curl/Postman and the next frontend wiring step.

## What you should not do (for “no spend”)

- Do **not** rent a always-on Node VM “just to keep the server running”.
- Do **not** put `SUPABASE_SERVICE_ROLE_KEY` in the Angular app or commit it to git.
- Do **not** rely on Netlify Function memory as a shared database — use Supabase Postgres.

## Netlify site settings checklist

- **Build command:** from `netlify.toml` (`npm run build && npm --prefix server ci && npm --prefix server run build`)
- **Publish directory:** `dist/trip-hunter/browser`
- **Functions directory:** `netlify/functions`
- **Branch:** `main` (or this feature branch for a preview deploy)

Optional: enable Deploy Previews so each PR gets a free preview URL for the team.

## Smoke test after deploy

```bash
curl -s https://YOUR_SITE.netlify.app/api/v1/health
# open https://YOUR_SITE.netlify.app/login in the browser
```

## Related docs

- [Node ↔ DB integration](./nodejs-db-integration.md)
- [Architecture overview](../architecture/overview.md)
