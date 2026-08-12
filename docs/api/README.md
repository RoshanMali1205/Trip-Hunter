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

The server currently attaches a mock user when any non-empty Bearer token is present. Production will validate the JWT against Supabase.

## Current v1 routes (stubs)

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/health` | No | Liveness |
| `GET` | `/api/v1/me` | Yes | Current user stub |
| `GET` | `/api/v1/trips` | Yes | Sample Goa trips |
| `GET` | `/api/v1/trips/:id` | Yes | Single trip |

## Local vs Netlify

- Local: `cd server && npm run dev` → Express on `PORT` (default `3000`).
- Netlify: `/api/*` redirects to `/.netlify/functions/api/:splat`. Full Express mounting lands when `serverless-http` is connected.
