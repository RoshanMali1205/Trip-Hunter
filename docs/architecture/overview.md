# Trip Hunter architecture overview

Trip Hunter is a team trip planning product with an Angular SPA front end, a Node/Express API, Supabase (Postgres + Auth), and Netlify for hosting plus serverless API edge.

## Layers

| Layer | Location | Role |
| --- | --- | --- |
| Web app | `src/` (Angular) | Auth UI, trip dashboards, planning workflows |
| API | `server/` | Versioned REST (`/api/v1`), validation, domain modules |
| Data | `supabase/migrations/` | Organizations, trips, budgets, expenses, collaboration |
| Edge | `netlify/` | Static publish + `/api/*` → Functions |

## Request flow

1. Browser loads the Angular app from Netlify (`dist/trip-hunter/browser`).
2. Client calls `/api/v1/...` with a Bearer JWT (Supabase session).
3. Netlify redirects `/api/*` to the `api` function, which mounts the Express app via `serverless-http`.
4. Locally, run `npm run server:dev` for the same Express surface without Netlify.

## Domain shape

- **Organization** is the tenancy boundary; members join via `org_members`.
- **Teams** group people; **trips** are planned events (seed scenario: Goa team outing).
- Planning entities: availability, destinations, itinerary.
- Commercial entities: bookings, budgets, expenses + splits.
- Collaboration: tasks, documents, approvals, comments, notifications, activity logs.

## API conventions

Responses use a uniform envelope:

- Success: `{ success: true, data, message? }`
- Error: `{ success: false, error: { code, message } }`

See [API README](../api/README.md) for versioning notes.

## Node ↔ DB wiring

- Auth: Supabase JWT via `auth.getUser` (`server/src/middleware/authentication.ts`).
- Data: repositories under `server/src/modules/` query Postgres through the service-role client when configured; otherwise in-memory seed (non-production). RLS plus org/trip policies live in migrations `018`–`019`. The service-role client bypasses RLS; the SPA is still authorized in the API. Direct PostgREST with a user JWT is limited to that user's org/trips.
- Edge: `netlify/functions/api.ts` mounts Express with `serverless-http`.

See [Node.js ↔ DB integration](../api/nodejs-db-integration.md).
