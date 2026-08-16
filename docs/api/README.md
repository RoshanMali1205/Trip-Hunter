# Trip Hunter API

## Versioning

All HTTP endpoints live under `/api/v1`.

- **v1** is the current stable surface for the Angular client and Netlify Functions proxy.
- Breaking changes require a new path prefix (`/api/v2`) rather than silent behavior changes on v1.
- Additive fields on existing success payloads are non-breaking; removing or renaming fields is breaking.

## Envelope

Every JSON response uses one of:

```json
{ "success": true, "data": {}, "message": "optional" }
```

```json
{ "success": false, "error": { "code": "TRIP_NOT_FOUND", "message": "..." } }
```

Clients should branch on `success` before reading `data` or `error`.

## Auth

Protected routes expect:

```http
Authorization: Bearer <supabase-access-token>
```

When `SUPABASE_URL` + keys are set, the API validates the JWT with Supabase `auth.getUser` and loads `profiles` / `org_members`. Without keys (non-production), any non-empty Bearer token attaches the mock Acme user.

## Current v1 routes

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | No | Liveness + `auth` / `data` mode |
| `GET` | `/api/v1/me` | Yes | Authenticated user |
| `GET` | `/api/v1/me/invites` | Yes | Pending trip invites |
| `GET` | `/api/v1/me/approvals` | Yes | Pending org approvals |
| `GET` | `/api/v1/me/expense-summary` | Yes | Paid / share / receive totals |
| `GET` | `/api/v1/me/activity` | Yes | Recent org activity |
| `GET` | `/api/v1/trips` | Yes | Org-scoped trips |
| `GET` | `/api/v1/trips/:id` | Yes | Single trip |
| `POST` | `/api/v1/trips` | Yes | Create trip (`approvalRequired` optional) |
| `PATCH` | `/api/v1/trips/:id` | Yes | Update trip fields + budget |
| `DELETE` | `/api/v1/trips/:id` | Yes | Delete trip (owner) |
| `POST` | `/api/v1/trips/:tripId/tasks` | Yes | Create task |
| `GET` | `/api/v1/trips/:tripId/settlements` | Yes | Who owes whom |
| `GET` | `/api/v1/trips/:tripId/approvals` | Yes | Trip approvals |
| `PATCH` | `/api/v1/approvals/:id` | Yes | Approve / reject |
| `GET` | `/api/v1/trips/:tripId/activity` | Yes | Trip activity feed |
| `GET` | `/api/v1/trips/:tripId/comments` | Yes | Trip comments |
| `POST` | `/api/v1/trips/:tripId/comments` | Yes | Add comment |
| `DELETE` | `/api/v1/trips/:tripId/comments/:id` | Yes | Delete own comment |
| `DELETE` | `/api/v1/trips/:tripId/bookings/:id` | Yes | Delete booking |
| `DELETE` | `/api/v1/trips/:tripId/itinerary/:id` | Yes | Delete itinerary item |
| `DELETE` | `/api/v1/trips/:tripId/members/:memberId` | Yes | Remove member (owner) |
| `GET` | `/api/v1/advisor` | Yes | Buddy advisor metadata |
| `POST` | `/api/v1/advisor/chat` | Yes | Gemini India trip chat |

Also: members, polls, itinerary, bookings, budget, expenses, tasks list/status, notifications — see controllers under `server/src/modules/`.

Apply `supabase/migrations/012_trip_meta_fields.sql` for origin / trip type / max members / approval status columns.

## Local vs Netlify

- Local: `cd server && npm run dev` → Express on `PORT` (default `3000`).
- Netlify: `/api/*` → `/.netlify/functions/api/:splat` → Express via `serverless-http`.
