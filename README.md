# Vue Enterprise Auth Starter

A production-style Vue 3 authentication and authorization starter focused on real project requirements:

- Login / refresh / logout / logout-all session lifecycle
- Access token + refresh token flow with retry queue on `401`
- Route-level RBAC guards and UI-level `v-permission` directive
- Multi-tab session synchronization (BroadcastChannel + storage fallback)
- TypeScript-first auth core with strict type checking
- Unified auth error-code adapter layer
- Mock auth backend for full local demo

## Tech Stack

- Vue 3 + Vite
- TypeScript + vue-tsc
- Pinia
- Vue Router
- Axios
- Express mock server

## Quick Start

```bash
npm install
npm run dev:full
```

This runs:

1. Frontend: `http://localhost:5173`
2. Mock auth API: `http://localhost:3000`

### Demo Accounts

- `admin@corp.com / Admin@123`
- `viewer@corp.com / Viewer@123`

## Project Structure

```text
src/
  api/            # HTTP clients and auth API wrappers
  composables/    # auth sync and permission helpers
  directives/     # v-permission
  errors/         # unified auth error-code adapter
  router/         # route definitions + auth guard
  stores/         # Pinia auth state machine
  types/          # shared TS interfaces and declarations
  views/          # login/dashboard/admin/403/404 pages
mock/
  server.js       # local auth backend for demo
```

## Unified Error Adapter

`src/errors/auth-error.ts` normalizes backend and transport errors into stable frontend codes.

- Backend code mapping: `INVALID_CREDENTIALS`, `TOKEN_EXPIRED`, `NO_REFRESH_TOKEN`, etc.
- HTTP status fallback mapping: `401 -> UNAUTHORIZED`, `403 -> FORBIDDEN`, `5xx -> SERVER_ERROR`.
- Network and timeout mapping: `NETWORK_ERROR`, `REQUEST_TIMEOUT`.

This allows UI and stores to consume a stable error model rather than raw axios payload shapes.

## Auth Flow (Frontend)

1. App bootstraps by calling `/auth/me`.
2. If unauthorized, it attempts `/auth/refresh` once.
3. On login, frontend stores access token in memory store and fetches `/auth/me`.
4. On API `401`, axios interceptor triggers a single refresh request, then retries pending calls.
5. If refresh fails, local session is cleared and user is redirected to login.
6. Logout events are broadcast to all tabs.

## Route & Permission Strategy

- Route access is enforced in `src/router/index.ts` via `meta.requiresAuth` and `meta.permissions`.
- UI-level controls use `v-permission` for button/menu visibility.
- Frontend permission checks are UX only; backend must still enforce authorization.

## Backend API Contract

Required endpoints for real backend integration:

- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/auth/me`
- `POST /api/auth/logout`
- `POST /api/auth/logout-all`

Suggested response fields:

- `accessToken`
- `expiresIn`
- `user`, `roles`, `permissions`
- stable error codes (`TOKEN_EXPIRED`, `INVALID_CREDENTIALS`, etc.)

## Integrating Into Existing Vue Projects

1. Copy `src/api/http.ts`, `src/api/auth.ts`, `src/stores/auth.ts`, and `src/errors/auth-error.ts`.
2. Mount interceptors in app entry (`setupHttpInterceptors`).
3. Add route guards using this project as reference.
4. Add `v-permission` directive and optionally `usePermission` composable.
5. Align backend response shape and error codes.

## Open Source Checklist

Before publishing:

1. Remove private domains, secrets, and company-specific logic.
2. Replace demo accounts and mock data.
3. Add CI checks and tests for guards/interceptors.
4. Keep license and README updated.

## Scripts

- `npm run dev`: run frontend only
- `npm run mock`: run mock auth backend only
- `npm run dev:full`: run both frontend and mock backend
- `npm run typecheck`: run strict TS checks
- `npm run build`: typecheck + production build
- `npm run preview`: preview built app