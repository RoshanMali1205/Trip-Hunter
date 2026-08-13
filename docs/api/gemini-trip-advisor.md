# Buddy — Gemini India Trip Advisor

Floating chat assistant in the authenticated app shell. Persona: **Buddy**, a specialist for India destinations, seasons/weather windows, budgets, and itineraries.

## Setup

1. Create a key in [Google AI Studio](https://aistudio.google.com/apikey).
2. Set **server-only** env (never put this in `public/env.js`):

```bash
GEMINI_API_KEY=your-key
# optional
GEMINI_MODEL=gemini-2.0-flash
```

3. Local: add to `.env`, restart `npm run server:dev`.
4. Netlify: Site settings → Environment variables → `GEMINI_API_KEY` → redeploy.

## API

| Method | Path | Auth | Notes |
| --- | --- | --- | --- |
| `GET` | `/api/v1/advisor` | Yes | Greeting, suggestions, `configured` flag |
| `POST` | `/api/v1/advisor/chat` | Yes | Body: `{ message, history?: [{ role, text }] }` |

Success chat payload:

```json
{ "success": true, "data": { "reply": "...", "model": "gemini-2.0-flash" } }
```

Without `GEMINI_API_KEY`, chat returns `503` / `GEMINI_NOT_CONFIGURED`. The UI still opens and shows setup guidance.

## Security

The Gemini key stays on the Express/Netlify function. The Angular client only calls `/api/v1/advisor/*` with the user’s Bearer token.
