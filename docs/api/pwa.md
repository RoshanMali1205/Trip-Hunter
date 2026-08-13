# Progressive Web App (PWA)

Trip Hunter ships as an installable PWA on production builds (`ng build` / Netlify).

## What’s included

| Piece | Role |
| --- | --- |
| `public/manifest.webmanifest` | Name, icons, theme, standalone display |
| `public/favicon.svg` / `favicon.ico` / `public/icons/*` | Unique Trip Hunter mark for browser tab, Apple touch, and installed PWA |
| `ngsw-config.json` + `@angular/service-worker` | Offline shell + versioned asset cache |
| `PwaUpdateService` | Detects new deploys and shows a **Refresh** banner |
| `PwaInstallService` | Captures `beforeinstallprompt` for **Install** |
| Netlify `Cache-Control` headers | Keeps `index.html` / `ngsw*` / `env.js` uncached so phones can see updates |

Service worker registration is **production-only** (`!isDevMode()`).

## Why mobile looked “stuck” on an old UI

1. The Angular service worker prefetches `index.html` and JS. Without an update check + reload, mobile Safari/Chrome keep the previous version after a Netlify deploy.
2. Long-lived CDN/browser cache on `index.html` or `ngsw.json` delays discovery of new versions.
3. Features still on an open PR (not merged to `main`) never reach the live site.

This setup fixes (1) and (2). For (3), merge the PR and wait for Netlify deploy, then open the site (or tap **Refresh** on the update banner).

### Immediate unblock on a phone

- Open the site in the browser (not only the installed icon), pull to refresh, or
- Site settings → clear data for the Trip Hunter origin, or
- Tap **Refresh** when the orange “new version” banner appears after this deploy.

## Install

- **Android Chrome:** Install banner, or menu → *Install app* / *Add to Home screen*
- **iOS Safari:** Share → *Add to Home Screen* (iOS does not fire `beforeinstallprompt`)

## Local verification

```bash
npm run build
npx serve dist/trip-hunter/browser   # HTTPS or localhost required for SW
```

Confirm `/ngsw.json` and `/ngsw-worker.js` exist in the publish folder.
