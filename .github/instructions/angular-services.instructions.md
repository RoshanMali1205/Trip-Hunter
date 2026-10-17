---
description: 'Use when: creating or editing Angular services, injectable classes, HTTP calls, RxJS patterns, or API integration.'
applyTo: '**/*.service.ts'
---

# Angular Service Conventions

## Injectable Pattern

- Use `@Injectable({ providedIn: 'root' })` for singleton services
- Feature-scoped services go in the feature module's `providers` array (NgModule) or in a route's `providers` (standalone)
- Do not create duplicate services — scan the project's services folder first

## HTTP & REST — Trip Hunter

- Use `HttpClient` from `@angular/common/http`
- Call `/api/v1/...` (see `API_BASE_URL` / `public/env.js`); local `ng serve` proxies `/api` → `:3000`
- Prefer existing clients: `TripApiService`, `AdvisorApiService`, `NotificationApiService`, etc.
- Expect envelope `{ success: true, data }` / `{ success: false, error: { code, message } }`
- Handle errors with RxJS `catchError` — surface user messages via `ToastService` / `api-error-message` helpers when nearby code does
- Use `HttpParams` for query parameters, not string concatenation
- Auth: Bearer JWT via `auth.interceptor.ts` — do not invent a second auth header path

## RxJS Conventions

- Import operators based on RxJS version:
  - RxJS 6.x: `import { map, catchError } from 'rxjs/operators'`
  - RxJS 7+: `import { map, catchError } from 'rxjs'`
- Never use `import 'rxjs/Rx'` (RxJS 5 legacy)
- Prefer `pipe()` operator chaining
- Use `BehaviorSubject` / `Subject` for state management where appropriate
- Clean up subscriptions — provide `takeUntil`, `take(1)`, `takeUntilDestroyed()`, or explicit `unsubscribe()`

## Service Reuse

Before creating a new service, scan the project's services folder. Common reusable concerns include:
- Authentication & session
- Base REST operations
- i18n / translation
- User preferences
- Error handling
- Logging
- Notifications / toasts
- Cookies / local storage
- App configuration

If a similar service exists, extend or compose with it instead of duplicating.

## Error Handling

- Catch errors at the service level when the service is responsible for fallback behavior
- Let errors propagate to the component when UI-level error handling is needed
- Use the project's centralized error-handling service for user-visible errors

## Date Handling

- Use the project's date library from `PROJECT-CONVENTIONS.md` (`date-fns`, `dayjs`, `Luxon`, `moment`, or native `Date`)
- Use the project's date service / utility for common formatting if one exists
- Be timezone-aware for any user-facing date display
