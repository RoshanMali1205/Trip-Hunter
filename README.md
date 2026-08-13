# Trip Hunter

Collaborative trip planning and trip management for office teams — from idea and availability voting through approvals, itinerary, bookings, expenses, and settlement.

<<<<<<< HEAD
**Stack:** Angular 22 · Angular Material · Signals · PWA · Node.js/Express (Netlify Functions) · Supabase Auth/Postgres
=======
**Stack:** Angular 22 · Angular Material · Signals · PWA · Node.js/Express (Netlify Functions) · Supabase Postgres/Auth
>>>>>>> origin/main

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:4200/login`. Use **Sign in** or **Create account**. Without Supabase keys the app runs in demo auth (any email + password 6+ chars). With keys, it uses Supabase Auth — see [docs/api/auth-login-signup.md](docs/api/auth-login-signup.md).

### API (Node + DB)

```bash
cp .env.example .env   # add Supabase keys, or leave blank for mock data
cd server
npm install
npm run dev
```

`GET /api/v1/health` reports whether auth/data use Supabase or in-memory mocks. Details: [docs/api/nodejs-db-integration.md](docs/api/nodejs-db-integration.md).

## What's included (Sprint 1–2 foundation)

- Standalone Angular 22 app with lazy-loaded routes
- App shell (sidebar / mobile bottom nav)
- Login, dashboard, trip list / create wizard / detail tabs
- Feature modules aligned to the LLD (`core`, `shared`, `layout`, `features`)
- Design tokens + Material theme (coastal teal / sunset accent)
- PWA manifest + service worker
- Express API stub under `server/`
- Netlify config + function entry
- Supabase SQL migrations under `supabase/migrations/`

## Main routes

| Path | Purpose |
|------|---------|
| `/login` | Sign in / create account |
| `/auth/callback` | OAuth / email confirm redirect |
| `/dashboard` | Attention widgets |
| `/trips` | Trip list |
| `/trips/create` | Creation wizard |
| `/trips/:tripId/*` | Overview, members, polls, itinerary, bookings, budget, expenses, tasks, documents, activity |
| `/notifications` `/profile` `/calendar` `/tasks` `/expenses` | Supporting surfaces |

## Repository layout

```text
trip-hunter/
├── src/                 # Angular application
├── server/              # Node + Express API
├── netlify/functions/   # Serverless entry
├── supabase/migrations/ # PostgreSQL schema
├── docs/                # Architecture & API notes
└── netlify.toml
```

## Design note

The linked Claude artifact requires sign-in, so the first UI pass follows the LLD (clean travel dashboard, Material + custom SCSS). Share exported screens/Figma and we can align pixel-perfect.

## Deploy live for free (team URL)

You do **not** need a paid Node host. Netlify serves Angular **and** runs the Express API as **serverless Functions** (only when `/api` is called). Supabase free tier holds Auth + Postgres.

```text
Netlify free  →  Angular SPA + /api (Express via Functions)
Supabase free →  Auth + database
```

Step-by-step: [docs/api/free-live-hosting.md](docs/api/free-live-hosting.md).

**Short path**

1. Connect [RoshanMali1205/Trip-Hunter](https://github.com/RoshanMali1205/Trip-Hunter) to [Netlify](https://app.netlify.com) (import from GitHub).
2. Deploy — teammates open `https://….netlify.app` (UI works with local mocks immediately).
3. Optional shared DB: create free Supabase project, apply `supabase/migrations/`, add `SUPABASE_*` env vars in Netlify, redeploy.

## License

Private / proprietary unless otherwise stated.
