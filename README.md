# Trip Hunter

Collaborative trip planning and trip management for office teams — from idea and availability voting through approvals, itinerary, bookings, expenses, and settlement.

**Stack:** Angular 22 · Angular Material · Signals · PWA · Node.js/Express (Netlify Functions) · Supabase Postgres/Auth

## Quick start

```bash
npm install
npm start
```

Open `http://localhost:4200`. Demo auth accepts any valid email (or Microsoft button). The UI uses mock trip data so you can explore the full shell without a backend.

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
| `/login` | Auth |
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

## Deploy

Configured for Netlify:

- Build: `npm run build`
- Publish: `dist/trip-hunter/browser`
- API: `/api/*` → `/.netlify/functions/api`

Connect the GitHub repo [RoshanMali1205/Trip-Hunter](https://github.com/RoshanMali1205/Trip-Hunter) to Netlify for CI/CD.

## License

Private / proprietary unless otherwise stated.
