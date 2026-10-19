# Vercel deployment

Import this repository into Vercel from its repository root. The Vercel project
configuration builds two services:

- `app` (`.`): the TanStack Start frontend.
- `server` (`server`): the Express API and Socket.IO endpoint.

Both services receive public traffic through the root rewrites in
[`vercel.json`](./vercel.json). `/api/*` and `/socket.io/*` are routed to the
server; all other paths are routed to the app. The browser calls `/api` and
Socket.IO on the same origin, so no public API hostname or build-time API URL
is needed. The app service's framework is left for Vercel to detect from the
Lovable/TanStack Start project configuration. `@lovable.dev/vite-tanstack-config`
is above the version required for Vercel's documented zero-configuration
detection.

Configure these variables in the Vercel `server` service for each environment
that should access the API. Use separate database settings for Preview or
Development if those environments should not use production data.

- Required for the API: `DATABASE_URL`, `DIRECT_URL`, `JWT_ACCESS_SECRET`, and
  `JWT_REFRESH_SECRET`. Use Supabase connection strings reachable from Vercel;
  the pooled connection is suitable for serverless runtime traffic.
- Required only if password-reset emails should work:
  `SMTP_HOST`, `SMTP_PORT`, `SMTP_SECURE`, `SMTP_USER`, `SMTP_PASSWORD`, and
  `FRONTEND_URL`. For Gmail, use `smtp.gmail.com`, port `587`, and
  `SMTP_SECURE=false`; the mailer requires STARTTLS on port 587. Use a Google
  App Password for `SMTP_PASSWORD`. Set `FRONTEND_URL` to the deployed
  frontend's origin so reset links open `/auth?mode=reset`. `SMTP_FROM` is
  optional and defaults to `SMTP_USER`.
- `CORS_ORIGIN`: optional comma-separated allowlist for additional origins.
  Same-origin API requests are allowed automatically.
- `JWT_ACCESS_TTL` and `JWT_REFRESH_TTL`: optional; the application has defaults.

Keep all credentials in the server service's Vercel environment settings, never
in frontend variables or source files. Do not send secret values in chat. The
frontend uses `/api` in production; `VITE_API_URL` only affects local
development.

Do not set a binding URL yourself. The frontend makes browser-to-public-route
requests, and the server does not call the frontend service, so this layout has
no service-to-service caller that needs a binding.

The configured Supabase database was checked read-only: both migrations are
applied and the schema is up to date. Its recorded execution order is
`20260718115002_init` followed by `20260518120000_password_reset_tokens`.
Although the migration directory names sort in the opposite order, do not
rename an already-applied migration: Prisma records migration names and
checksums. Deploying against this already-migrated database has no pending
migration to run. A brand-new empty database has not been validated; the
current directory sort order would attempt the reset-token migration before
the migration that creates `users`, so fix/reconcile migration history before
bootstrapping a new database. Do not run the demo seed in production.

The Express entrypoint exports an HTTP server without calling `listen()`, as
required for Vercel's request-driven Function runtime. The separate local
`server.ts` entrypoint continues to listen on `PORT` for local development.
Socket.IO uses WebSocket-only transport as required by Vercel Functions.
Vercel WebSockets are in beta, and each connection is pinned to one Function
instance. Socket.IO currently has no cross-instance adapter, so broadcasts from
another Function instance may not reach that connection; verify this behavior
under deployment traffic or add a shared realtime adapter if reliable
cross-instance delivery is required.

Vercel's service rewrites preserve the original path. The Express app mounts
its router at `/api`, matching the `/api/*` rewrite without a path adjustment.

The repository does not define a separate frontend Supabase URL/key: browser
data requests go to the Express API, which uses Prisma/Postgres. `DATABASE_URL`
and `DIRECT_URL` are the Supabase-related runtime/build environment names.
