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
| `GET` | `/api/v1/trips` | Yes | Org-scoped trips (Supabase or memory) |
| `GET` | `/api/v1/trips/:id` | Yes | Single trip |

| `GET` | `/api/v1/advisor` | Yes | Buddy advisor metadata |
| `POST` | `/api/v1/advisor/chat` | Yes | Gemini India trip chat |

Integration details: [nodejs-db-integration.md](./nodejs-db-integration.md). Auth UI notes: [auth-login-signup.md](./auth-login-signup.md). PWA / mobile updates: [pwa.md](./pwa.md). Member invites: [member-invites.md](./member-invites.md). Gemini Buddy advisor: [gemini-trip-advisor.md](./gemini-trip-advisor.md).

## Local vs Netlify

- Local: `cd server && npm run dev` → Express on `PORT` (default `3000`).
- Netlify: `/api/*` → `/.netlify/functions/api/:splat` → Express via `serverless-http`.
