# Trip Hunter API

## Versioning

All HTTP endpoints live under `/api/v1`.

- **v1** is the current stable surface for the Angular client and Netlify Functions.
- Breaking changes require a new path prefix (`/api/v2`).
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

## Local vs Netlify

- Local: `npm run server:dev` → Express on `PORT` (default `3000`). Point the SPA at `http://localhost:3000/api/v1` via `API_BASE_URL` / `public/env.js`.
- Netlify: `/api/*` → `/.netlify/functions/api/:splat` → the same Express app via `serverless-http`.

`GET /api/v1/health` reports `auth` (`supabase` \| `mock`) and `data` (`supabase` \| `memory` \| `unavailable`).

## Current v1 routes

Mounted in `server/src/index.ts`.

### Health and current user

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | No | Liveness + `auth` / `data` mode |
| `GET` | `/api/v1/me` | Yes | Authenticated user |
| `GET` | `/api/v1/me/invites` | Yes | Pending trip invites |
| `GET` | `/api/v1/me/approvals` | Yes | Pending org approvals |
| `GET` | `/api/v1/me/expense-summary` | Yes | Paid / share / receive totals |
| `GET` | `/api/v1/me/settlements` | Yes | Org-wide who-owes-whom, including paid |
| `GET` | `/api/v1/me/activity` | Yes | Recent org activity |
| `GET` | `/api/v1/org/members` | Yes | Active people in the caller’s org |

### Teams

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/teams` | Yes | Org teams |
| `POST` | `/api/v1/teams` | Yes | Create team (creator becomes lead) |
| `GET` | `/api/v1/teams/:id` | Yes | Team + members |
| `DELETE` | `/api/v1/teams/:id` | Yes | Delete (creator) |
| `POST` | `/api/v1/teams/:id/members` | Yes | Add by registered org email |
| `DELETE` | `/api/v1/teams/:id/members/:memberId` | Yes | Remove member |

`POST /api/v1/trips` and `PATCH /api/v1/trips/:id` accept optional `teamId`.

### Trips

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips` | Yes | Org-scoped trips |
| `GET` | `/api/v1/trips/:id` | Yes | Single trip |
| `POST` | `/api/v1/trips` | Yes | Create (`approvalRequired` optional) |
| `PATCH` | `/api/v1/trips/:id` | Yes | Update fields + budget |
| `DELETE` | `/api/v1/trips/:id` | Yes | Delete (owner) |

### Members

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips/:tripId/members` | Yes | List members |
| `POST` | `/api/v1/trips/:tripId/members` | Yes | Invite by registered email |
| `PATCH` | `/api/v1/trips/:tripId/members/me` | Yes | Accept / decline invite |
| `DELETE` | `/api/v1/trips/:tripId/members/:memberId` | Yes | Remove (owner) |

### Polls (destinations and availability)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips/:tripId/availability` | Yes | Date options |
| `POST` | `/api/v1/trips/:tripId/availability` | Yes | Add date option |
| `POST` | `/api/v1/trips/:tripId/availability/vote` | Yes | Cast availability vote |
| `POST` | `/api/v1/trips/:tripId/availability/select` | Yes | Owner locks trip dates from a poll option |
| `GET` | `/api/v1/trips/:tripId/destinations` | Yes | Destination options |
| `POST` | `/api/v1/trips/:tripId/destinations` | Yes | Add destination |
| `POST` | `/api/v1/trips/:tripId/destinations/:destinationId/vote` | Yes | Vote for a destination |
| `POST` | `/api/v1/trips/:tripId/destinations/:destinationId/select` | Yes | Owner locks the destination |
| `GET` | `/api/v1/trips/:tripId/votes/me` | Yes | Current user’s votes |

### Itinerary and bookings

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips/:tripId/itinerary` | Yes | List items |
| `POST` | `/api/v1/trips/:tripId/itinerary` | Yes | Create item |
| `PATCH` | `/api/v1/trips/:tripId/itinerary/:id` | Yes | Update item |
| `DELETE` | `/api/v1/trips/:tripId/itinerary/:id` | Yes | Delete item |
| `GET` | `/api/v1/trips/:tripId/bookings` | Yes | List bookings |
| `POST` | `/api/v1/trips/:tripId/bookings` | Yes | Create booking |
| `PATCH` | `/api/v1/trips/:tripId/bookings/:id` | Yes | Update booking |
| `DELETE` | `/api/v1/trips/:tripId/bookings/:id` | Yes | Delete booking |

### Budget, expenses, settlements

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips/:tripId/budget` | Yes | Categories |
| `POST` | `/api/v1/trips/:tripId/budget` | Yes | Create category |
| `PATCH` | `/api/v1/trips/:tripId/budget/:categoryId` | Yes | Update category |
| `DELETE` | `/api/v1/trips/:tripId/budget/:categoryId` | Yes | Delete category |
| `GET` | `/api/v1/trips/:tripId/expenses` | Yes | List expenses |
| `POST` | `/api/v1/trips/:tripId/expenses` | Yes | Create (with splits) |
| `PATCH` | `/api/v1/expenses/:id` | Yes | Update expense status |
| `GET` | `/api/v1/trips/:tripId/settlements` | Yes | Computed who-owes-whom (minus recorded payments) |
| `POST` | `/api/v1/trips/:tripId/settlements/pay` | Yes | Mark a pair as paid |

Settlements are derived from approved expenses. Payments are stored in `settlement_payments` (migration 017).

### Tasks, approvals, activity, comments, documents

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/trips/:tripId/tasks` | Yes | Trip tasks |
| `POST` | `/api/v1/trips/:tripId/tasks` | Yes | Create task |
| `GET` | `/api/v1/tasks` | Yes | Current user’s org tasks |
| `PATCH` | `/api/v1/tasks/:id` | Yes | Update status and/or `assignedTo` |
| `GET` | `/api/v1/trips/:tripId/approvals` | Yes | Trip approvals |
| `PATCH` | `/api/v1/approvals/:id` | Yes | Approve / reject |
| `GET` | `/api/v1/trips/:tripId/activity` | Yes | Trip activity feed |
| `GET` | `/api/v1/trips/:tripId/comments` | Yes | Trip comments |
| `POST` | `/api/v1/trips/:tripId/comments` | Yes | Add comment (`parentId` for replies) |
| `DELETE` | `/api/v1/trips/:tripId/comments/:id` | Yes | Delete own comment |
| `GET` | `/api/v1/trips/:tripId/documents` | Yes | List documents |
| `POST` | `/api/v1/trips/:tripId/documents` | Yes | Upload (base64, max 5 MB) |
| `DELETE` | `/api/v1/trips/:tripId/documents/:id` | Yes | Remove document + Storage object |

### Notifications and Buddy

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/notifications` | Yes | In-app notifications |
| `PATCH` | `/api/v1/notifications/:id/read` | Yes | Mark one read |
| `POST` | `/api/v1/notifications/read-all` | Yes | Mark all read |
| `GET` | `/api/v1/advisor` | Yes | Buddy metadata + `configured` |
| `POST` | `/api/v1/advisor/chat` | Yes | Gemini India trip chat |

## Migrations the API expects

Apply `supabase/migrations/` in order (`001`–`019`). On an existing project, these are the later ones that trip features depend on:

- `012_trip_meta_fields.sql` — origin / trip type / max members / approval status
- `013_trip_documents_storage.sql` — `trip-documents` Storage bucket
- `014_avatar_remove_size_limit.sql` — remove avatars bucket size cap
- `015_backfill_org_membership.sql` — backfill profile + org membership so existing users can create trips
- `016_ensure_trip_meta_reload_schema.sql` — ensure 012 columns exist and reload PostgREST schema cache
- `017_pending_workflows.sql` — settlement payments, email invites before signup, lock poll dates (creates `availability_options` if 011 was skipped)
- `018_enable_rls_on_app_tables.sql` — enable RLS on trip/team/expense tables
- `019_rls_org_trip_policies.sql` — org/trip member policies (run with 018; service role still bypasses)

See also [nodejs-db-integration.md](nodejs-db-integration.md) and [auth-login-signup.md](auth-login-signup.md).
