# Trip Hunter API — Node.js ↔ Supabase (Postgres) integration

This document describes how the Express API under `server/` authenticates callers and reads Postgres via Supabase.

## Architecture

```text
Angular SPA  --Bearer JWT-->  Express (/api/v1)
                                 │
                                 ├─ authenticate middleware
                                 │    └─ supabase.auth.getUser(token)
                                 │    └─ profiles + org_members (service role)
                                 │
                                 └─ TripRepository
                                      └─ supabase.from('trips') (+ budgets)
                                           └─ Postgres (supabase/migrations)
```

| Concern | Mechanism |
| --- | --- |
| Auth | Supabase Auth JWT in `Authorization: Bearer …` |
| JWT check | `@supabase/supabase-js` → `auth.getUser(token)` (never trust unverified payload alone) |
| Data access | Service-role Supabase client after middleware auth (RLS not yet applied in migrations) |
| Schema | SQL under `supabase/migrations/` |
| Local without DB | In-memory Goa seed trips + mock user (non-production only) |
| Netlify | `netlify/functions/api.ts` wraps Express with `serverless-http` |

## Environment variables

Copy `.env.example` to `.env` at the repo root:

| Variable | Required for | Purpose |
| --- | --- | --- |
| `SUPABASE_URL` | Auth + DB | Project URL |
| `SUPABASE_PUBLIC_KEY` | Auth | Anon/publishable key for `getUser` |
| `SUPABASE_SERVICE_ROLE_KEY` | DB queries | Server-only key; never expose to the browser |
| `DATABASE_URL` | Optional | Direct Postgres URL if you use `psql` / migrators outside the JS client |
| `ALLOW_MOCK_DATA` | Optional | `true`/`false`; defaults to mock allowed outside `production` |

Without Supabase keys, `GET /api/v1/health` reports `auth: "mock"` and `data: "memory"`.

## Request flow (trips)

1. Client sends `GET /api/v1/trips` with a Supabase access token.
2. `authenticate` validates the token and loads `profiles` + first active `org_members` row.
3. `TripService` asks `TripRepository` for rows scoped by `organization_id` when present.
4. Rows map from snake_case SQL (`destination_summary`, `budgets.total_cents`) to the API `Trip` DTO.

## Local run

```bash
# Terminal A — API
cp .env.example .env   # fill Supabase values, or leave blank for mock mode
cd server && npm install && npm run dev

# Terminal B — SPA
npm start
```

Smoke checks:

```bash
curl -s http://localhost:3000/api/v1/health | jq
curl -s -H "Authorization: Bearer test" http://localhost:3000/api/v1/trips | jq
```

With real credentials, replace `test` with a session access token from Supabase Auth.

## Applying migrations

Use the Supabase CLI or SQL editor against your project:

```bash
supabase db push
# or apply files in supabase/migrations/ in order
```

## Netlify (free — no always-on Node server)

Build installs and compiles `server/`, then esbuild bundles `netlify/functions/api.ts`. Configure the same Supabase secrets in the Netlify UI (never commit them).

This is how production “keeps the server running” without renting a VM: each `/api` request wakes a Function. See [free-live-hosting.md](./free-live-hosting.md).

## Near-term follow-ups

- Add RLS policies and prefer a user-scoped client for reads where possible.
- Broader update endpoints for bookings/itinerary fields.
