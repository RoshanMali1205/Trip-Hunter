# Trip Hunter

Collaborative trip planning for office teams — from idea and voting through bookings, approvals, expenses, and settlement.

**Stack:** Angular 22 · Angular Material · Signals · PWA · Node.js / Express · Supabase Auth + Postgres · Netlify (static + Functions)

```text
Browser (Angular SPA)
        │  Bearer JWT
        ▼
Netlify  →  /api/v1  →  Express (Functions)
                            │
                            ▼
                     Supabase Auth + Postgres + Storage
```

## What works today

Trip tabs and the dashboard talk to the live `/api/v1` API (not a stub). With Supabase keys, data is shared. Without keys, the app runs in local demo / in-memory mode.

| Area | In the product |
|------|----------------|
| Auth | Email sign-in / sign-up, optional profile photo + phone, Azure OAuth hook |
| Trips | List, create, edit, delete; origin, dates, budget, approval status |
| Members | Invite by email (existing account or pending signup), accept/decline/maybe, owner can remove |
| Polls | Destination + availability options, votes, destination photo cards, owner can lock winner |
| Itinerary | Add, edit, and delete day items |
| Bookings | Add, edit, and delete (hotel, flight, bus, etc.) |
| Budget | Categories create / update / delete |
| Expenses | Create, status, splits, trip-level who-owes-whom, mark settlement paid |
| Tasks | Create, list, cycle status, assign to trip members |
| Approvals | Pending list, approve / reject |
| Documents | Upload / list / delete (Storage bucket `trip-documents`) |
| Comments | Trip discussion on Overview (add / reply / delete own) |
| Activity | Trip feed + dashboard recent activity |
| Notifications | In-app list, mark read, trip invites |
| Teams | Create teams, add/remove members, attach a team when creating a trip |
| Buddy | Gemini India trip advisor chat (needs `GEMINI_API_KEY`) |
| PWA | Installable production build, update + install banners |

### Known gaps

- Settlements can be marked paid, but there is no bank/UPI transfer integration
- Notifications are in-app only (schema allows email / push)
- Custom expense splits and receipt uploads are not started

## Requirements

- **Node.js 22** (see `.nvmrc`)
- npm 11+ (repo `packageManager` is `npm@11.6.4`)

## Local development

```bash
git clone https://github.com/RoshanMali1205/Trip-Hunter.git
cd Trip-Hunter
cp .env.example .env          # fill keys, or leave blank for demo mode
npm install
npm --prefix server install
```

Run **two processes**:

```bash
# Terminal A — API (http://localhost:3000)
npm run server:dev

# Terminal B — Angular (http://localhost:4200)
npm start
```

Open [http://localhost:4200/login](http://localhost:4200/login).

### Point the SPA at the local API

The browser defaults to `/api/v1` (same origin). `ng serve` proxies `/api` to `http://localhost:3000` via `proxy.conf.json`, so local create-trip calls work as long as `npm run server:dev` is running.

To point at another API instead, set `API_BASE_URL` in `.env`, run `node scripts/write-browser-env.js`, and restart `npm start`.

### Demo vs Supabase

| Mode | When | Behavior |
|------|------|----------|
| Demo | `SUPABASE_URL` / `SUPABASE_PUBLIC_KEY` missing | Any email + password (6+ chars); in-memory trips |
| Live | Keys present in `.env` / Netlify | Real Auth, Postgres, Storage |

Health check:

```bash
curl -s http://localhost:3000/api/v1/health
```

`auth` is `supabase` or `mock`; `data` is `supabase`, `memory`, or `unavailable`.

## Environment

Copy `.env.example` → `.env`. Never commit secrets. Never put `SUPABASE_SERVICE_ROLE_KEY` in the browser.

| Variable | Used by | Purpose |
|----------|---------|---------|
| `SUPABASE_URL` | SPA + API | Project URL |
| `SUPABASE_PUBLIC_KEY` | SPA + API | Anon key (`auth.getUser`, browser Auth) |
| `SUPABASE_SERVICE_ROLE_KEY` | API only | Server queries (bypasses RLS) |
| `API_BASE_URL` | SPA (`public/env.js`) | Default `/api/v1`; local use `http://localhost:3000/api/v1` |
| `GEMINI_API_KEY` | API only | Buddy chat |
| `PORT` | API | Default `3000` |
| `ALLOW_MOCK_DATA` | API | In-memory fallback; allowed outside production by default |

`scripts/write-browser-env.js` writes `public/env.js` from `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, and `API_BASE_URL`. Netlify runs this during build.

## Database

SQL lives in `supabase/migrations/` (`001`–`018`). Apply in order (`supabase db push` or the SQL editor).

On an existing project, confirm these are applied:

| Migration | Why |
|-----------|-----|
| `012_trip_meta_fields.sql` | Origin, trip type, max members, approval status |
| `013_trip_documents_storage.sql` | `trip-documents` Storage bucket |
| `014_avatar_remove_size_limit.sql` | Remove avatars bucket size cap |
| `015_backfill_org_membership.sql` | Profiles + org membership for accounts that cannot create trips |
| `016_ensure_trip_meta_reload_schema.sql` | Re-add 012 columns if missing and reload the PostgREST schema cache |
| `017_pending_workflows.sql` | Settlement payments, email invites before signup, lock poll dates |
| `018_enable_rls_on_app_tables.sql` | RLS on trip/team/expense tables (no policies; API uses service role) |

Details: [docs/api/nodejs-db-integration.md](docs/api/nodejs-db-integration.md), [docs/api/auth-login-signup.md](docs/api/auth-login-signup.md).

## App routes

| Path | Purpose |
|------|---------|
| `/login` | Sign in / create account |
| `/auth/callback` | OAuth / email-confirm redirect |
| `/dashboard` | Upcoming trips, invites, tasks, activity |
| `/trips` | Trip list |
| `/trips/create` | Create wizard |
| `/trips/:tripId/overview` | Summary, edit trip, comments, approvals |
| `/trips/:tripId/members` | Invite, RSVP, remove |
| `/trips/:tripId/voting` | Destinations + availability polls |
| `/trips/:tripId/itinerary` | Day plan |
| `/trips/:tripId/bookings` | Stay / travel bookings |
| `/trips/:tripId/budget` | Budget categories (create / edit / delete) |
| `/trips/:tripId/expenses` | Expenses + settlements |
| `/trips/:tripId/tasks` | Trip tasks (assign + status) |
| `/trips/:tripId/documents` | File uploads |
| `/trips/:tripId/activity` | Audit feed |
| `/notifications` | In-app inbox + invites |
| `/profile` | Name, phone, avatar |
| `/calendar` | Month grid; full trip date ranges, previous/next month |
| `/tasks` | Tasks across trips |
| `/expenses` | Org expense summary and live settlements (mark paid) |
| `/teams` | Org teams and members (`/admin` redirects here) |

## API

All HTTP APIs are under `/api/v1`. Authenticated routes expect:

```http
Authorization: Bearer <supabase-access-token>
```

Envelope:

```json
{ "success": true, "data": {}, "message": "optional" }
```

```json
{ "success": false, "error": { "code": "TRIP_NOT_FOUND", "message": "..." } }
```

Full route table: [docs/api/README.md](docs/api/README.md).

## Repository layout

```text
trip-hunter/
├── src/                      # Angular SPA
├── server/                   # Express API (`/api/v1`)
├── netlify/functions/        # serverless-http wrapper
├── supabase/migrations/      # Postgres + Storage
├── public/                   # PWA assets, env.js
├── scripts/                  # Netlify build + browser env
├── docs/                     # Architecture and API notes
├── netlify.toml
└── .env.example
```

## Deploy (free)

Netlify serves the Angular build and runs the **same Express app** as Functions (`/api/*`). Supabase free tier holds Auth, Postgres, and Storage. No always-on Node host.

1. Connect this repo to [Netlify](https://app.netlify.com) (build uses `netlify.toml` / `scripts/netlify-build.sh`).
2. Set `SUPABASE_URL`, `SUPABASE_PUBLIC_KEY`, `SUPABASE_SERVICE_ROLE_KEY`. Optional: `GEMINI_API_KEY`.
3. Apply migrations `001`–`018` on the Supabase project.
4. Add Auth redirect URL `https://YOUR_SITE.netlify.app/auth/callback`.

Step-by-step: [docs/api/free-live-hosting.md](docs/api/free-live-hosting.md). PWA notes: [docs/api/pwa.md](docs/api/pwa.md).

## Docs

| Doc | Contents |
|-----|----------|
| [docs/architecture/overview.md](docs/architecture/overview.md) | Layers and domain |
| [docs/api/README.md](docs/api/README.md) | Versioning, envelope, route table |
| [docs/api/nodejs-db-integration.md](docs/api/nodejs-db-integration.md) | Auth + service-role data access |
| [docs/api/auth-login-signup.md](docs/api/auth-login-signup.md) | Demo vs Supabase Auth, avatars |
| [docs/api/member-invites.md](docs/api/member-invites.md) | Invite flow |
| [docs/api/gemini-trip-advisor.md](docs/api/gemini-trip-advisor.md) | Buddy / Gemini |
| [docs/api/pwa.md](docs/api/pwa.md) | Service worker, install, cache |
| [docs/api/free-live-hosting.md](docs/api/free-live-hosting.md) | Netlify + Supabase go-live |

## License

Private / proprietary unless otherwise stated.
