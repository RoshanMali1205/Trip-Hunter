# Auth (login & sign-up)

Trip Hunter supports two auth modes:

| Mode | When | Behavior |
| --- | --- | --- |
| **Demo** | `SUPABASE_URL` / `SUPABASE_PUBLIC_KEY` missing in `public/env.js` | Email + password accepted locally; session in `localStorage` |
| **Supabase** | Keys present | Real `signInWithPassword` / `signUp` / Azure OAuth |

## UI

- `/login` — tabs for **Sign in** and **Create account**
- `/auth/callback` — finishes OAuth / email-confirm redirects
- Shell **Sign out** clears Supabase session (or demo session)

## Enable Supabase Auth (free)

1. Create a Supabase project.
2. Apply migrations `001`–`006` (006 adds profile trigger + read RLS).
3. Auth → Providers → Email enabled; optionally Azure for Microsoft.
4. Auth → URL config → add redirect URLs:
   - `http://localhost:4200/auth/callback`
   - `https://YOUR_SITE.netlify.app/auth/callback`
5. Set Netlify env vars `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` (anon key).
6. Build runs `scripts/write-browser-env.js`, which writes `public/env.js` for the SPA.

Never put `SUPABASE_SERVICE_ROLE_KEY` in the browser.

## Local demo

```bash
npm start
# open /login — Create account or Sign in with any email + password (6+ chars)
```
