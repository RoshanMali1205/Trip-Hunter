# Auth (login & sign-up)

Trip Hunter supports two auth modes:

| Mode | When | Behavior |
| --- | --- | --- |
| **Demo** | `SUPABASE_URL` / `SUPABASE_PUBLIC_KEY` missing in `public/env.js` | Email + password accepted locally; session in `localStorage` |
| **Supabase** | Keys present | Real `signInWithPassword` / `signUp` / Azure OAuth |

## UI

- `/login` — tabs for **Sign in** and **Create account**
- **Create account** collects first/last name, **phone number**, email, password, and an optional **profile photo**
- `/auth/callback` — finishes OAuth / email-confirm redirects (and uploads a stashed signup photo if email confirmation delayed the session)
- Shell **Sign out** clears Supabase session (or demo session)
- `/profile` shows phone and avatar when present

## Enable Supabase Auth (free)

1. Create a Supabase project.
2. Apply migrations `001`–`008` (`006` profile trigger + RLS; `008` phone on signup + `avatars` storage bucket).
3. Auth → Providers → Email enabled; optionally Azure for Microsoft.
4. Auth → URL config → add redirect URLs:
   - `http://localhost:4200/auth/callback`
   - `https://YOUR_SITE.netlify.app/auth/callback`
5. Set Netlify env vars `SUPABASE_URL` and `SUPABASE_PUBLIC_KEY` (anon key).
6. Build runs `scripts/write-browser-env.js`, which writes `public/env.js` for the SPA.

Never put `SUPABASE_SERVICE_ROLE_KEY` in the browser.

### Profile photo

- Optional at signup (JPG/PNG/WebP/GIF, max 2 MB)
- Stored in the public `avatars` storage bucket under `{userId}/avatar.*`
- `profiles.avatar_url` and `profiles.phone` are updated after signup (or after first login if email confirmation was required)

## Local demo

```bash
npm start
# open /login — Create account or Sign in with any email + password (6+ chars)
```
