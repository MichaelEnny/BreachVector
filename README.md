# BreachVector

BreachVector is a production-style MVP for passive website security reviews. A user enters a domain or URL, the app runs safe public-facing checks, and the product turns those signals into an executive-friendly and technical report.

The project is designed to stay demoable in two modes:

- Full mode: Prisma + Supabase Postgres + Clerk + OpenAI
- Demo mode: seeded showcase reports, live passive checks, in-memory history, and template-generated narratives

## Submission kit

- User guide: [docs/user-guide.md](./docs/user-guide.md)
- Demo script: [docs/demo-script.md](./docs/demo-script.md)
- Screenshot shot list: [docs/screenshot-shot-list.md](./docs/screenshot-shot-list.md)
- Deployment verification notes: [docs/deployment-verification.md](./docs/deployment-verification.md)

## Why this stands out

- Strong product framing instead of a generic dashboard demo
- Safe passive-only security scope suitable for a student showcase
- Real full-stack architecture with auth, workspaces, persistence, exports, sharing, jobs, and observability
- Demo-safe fallback mode so the app still presents well without every external service configured

## Stack

- Next.js 15 App Router
- TypeScript
- Tailwind CSS
- shadcn/ui-style components in-repo
- Prisma
- Supabase Postgres
- OpenAI Responses API
- Clerk authentication
- PDF export with `pdf-lib`
- Deployable to Vercel

## What it does

- Branded landing page with a premium product presentation
- Analyze flow for domains or full URLs
- Safe passive checks only:
  - HTTPS availability
  - HTTP to HTTPS redirect
  - TLS certificate reachability and remaining lifetime when available
  - Security headers
  - Visible cookie flags
  - SPF, DMARC, MTA-STS, and CAA checks when resolvable
  - `robots.txt` and `security.txt` discovery
- AI or template-generated narrative report
- Results dashboard with score, findings, and remediation plan
- Clerk-backed sign-in with owned live scans, personal workspaces, team workspaces, and private history
- Read-only report sharing with public or authenticated-private token links across workspace-scoped reports
- Print-ready report views and PDF export
- Workspace invitations, teammate role management, and invite refresh/revoke flows
- Queued scan jobs with persisted claims, retries, status polling, and recent-result reuse
- Lightweight audit logging and route-level rate limiting for analyze, share, export, and workspace actions
- Workspace operations view for queue health, retries, failures, and recent activity
- Scan history persisted with Prisma when a database is configured
- Seeded showcase reports for demos and hackathon judging

## Quick start

1. Install dependencies:

```bash
npm install
```

2. Copy the environment example:

```bash
cp .env.example .env.local
```

3. If you plan to use Prisma locally, also copy the database variables into `.env` because the Prisma CLI reads `.env` by default.

4. Run in demo mode immediately:

```bash
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000)

If you stop here, the app still works in showcase mode. You will get seeded reports and template-generated narratives without database persistence. Add Clerk to unlock owned live scans. Add Supabase if you want persistent history, workspaces, sharing, export tracking, and durable jobs.

## Enable authentication and ownership

1. Create a Clerk application.
2. Add these environment variables:

```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=...
CLERK_SECRET_KEY=...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
```

3. Restart the dev server.

With Clerk enabled:

- Live scans require sign-in
- Every live scan is stored with an owner user ID
- `/history` shows workspace-aware history
- `/account` shows identity, usage, memberships, invites, and authored activity
- A free-tier limit of 8 scans per rolling 24 hours is enforced per user

## Enable Supabase Postgres persistence

1. Create a Supabase project.
2. Copy the Postgres connection strings into `DATABASE_URL` and `DIRECT_URL`.
3. Put those values in `.env` for Prisma CLI usage and in `.env.local` for the app runtime if you want both to see the same database.
4. Push the Prisma schema:

```bash
npm run prisma:push
```

5. Seed the showcase reports into the database:

```bash
npm run db:seed
```

After that:

- Scan history persists in Postgres
- Live scans are linked to owners through `ownerUserId` and to workspaces through `organizationId`
- Share links are stored in `ScanShare` and resolve against workspace access
- Export events are stored in `ReportExport`
- Queued jobs are stored in `ScanJob`
- Audit events are stored in `AuditEvent`
- Invites are stored in `WorkspaceInvite`
- Seeded demo reports appear from the database instead of the built-in fallback dataset

## Enable OpenAI report generation

Add these environment variables:

```bash
OPENAI_API_KEY=...
OPENAI_MODEL=gpt-5-mini
```

If `OPENAI_API_KEY` is not configured, BreachVector falls back to deterministic report templates so the product is always demo-ready.

## Durable worker-backed scan execution

The live analyze flow now creates a persisted `ScanJob` and drives the report through a durable worker-style pipeline:

- Analyze requests create a queued job instead of blocking the full passive review in one request
- Workers claim jobs with short leases and refresh heartbeats while work is in progress
- Jobs retry with backoff when a passive review fails transiently
- Recent workspace results are reused to avoid duplicate checks during demos and repeated testing
- `/jobs/[id]` polls status and redirects into the final report when complete
- `/ops` exposes queue pressure, stale jobs, retries, failures, and recent worker activity

The app can still kick jobs opportunistically from requests in development, but production should secure and schedule the internal worker route.

### Internal worker route

BreachVector exposes a protected worker endpoint at `/api/internal/jobs/process`.

It accepts:

- `GET /api/internal/jobs/process`
- `POST /api/internal/jobs/process` with JSON body `{ "batchSize": 3, "organizationId": "..." }`

Authorization:

- Set `JOB_WORKER_SECRET` or `CRON_SECRET`
- Send `Authorization: Bearer <secret>`
- In non-production without a configured secret, the route stays open for local development convenience

### Vercel Cron

A `vercel.json` cron is included to trigger the worker route every minute:

- Path: `/api/internal/jobs/process`
- Schedule: `* * * * *`

Notes:

- Vercel Cron hits the route with `GET`, which is why the worker route supports both `GET` and `POST`
- Minute-level schedules require a Vercel plan that supports them
- If your plan does not allow once-per-minute crons, adjust `vercel.json` to a supported cadence or use an external scheduler that calls the same route

## Workspaces, jobs, sharing, and export flow

When auth and the database are enabled, each live scan in the active workspace supports:

- `Queue scan` to create a tracked job
- Job status polling with redirect into the finished report
- Recent-result reuse to avoid duplicate passive scans within a short window
- `Print view` for a clean browser print layout
- `Export PDF` for a generated downloadable report
- `Create link` for a read-only tokenized share URL
- `Public` share links that work for anyone with the token
- `Private` share links that require sign-in before the report is revealed
- Recorded share opens and PDF export counts

Shared reports also have:

- A dedicated read-only report page
- A dedicated print layout
- PDF export using the same report data through a token-aware route

## Environment variables

Required for demo mode:

- None

Optional:

- `DATABASE_URL`
  Prisma pooled connection string for Supabase Postgres.
- `DIRECT_URL`
  Direct Postgres connection string for Prisma schema changes and maintenance operations.
- `OPENAI_API_KEY`
  Enables OpenAI-generated narratives.
- `OPENAI_MODEL`
  Defaults to `gpt-5-mini`.
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
  Enables Clerk on the client.
- `CLERK_SECRET_KEY`
  Enables Clerk session validation on the server.
- `NEXT_PUBLIC_CLERK_SIGN_IN_URL`
  Defaults to `/sign-in`.
- `NEXT_PUBLIC_CLERK_SIGN_UP_URL`
  Defaults to `/sign-up`.
- `JOB_WORKER_SECRET`
  Optional dedicated secret for manual worker calls or external schedulers.
- `CRON_SECRET`
  Optional Vercel Cron secret. The internal worker route accepts this as an alternative to `JOB_WORKER_SECRET`.
- `APP_URL`
  Useful for metadata, share URLs, and deployment context.

## Development commands

```bash
npm run dev
npm run build
npm run lint
npm run prisma:generate
npm run prisma:push
npm run db:seed
```

## Deploy to Vercel

1. Push the repo to GitHub.
2. Import the project into Vercel.
3. Add the same environment variables from `.env.example`.
4. Use a Supabase Postgres database for persistent scans.
5. Set `CRON_SECRET` or `JOB_WORKER_SECRET` before enabling scheduled processing.
6. Run `npm run prisma:push` once against the production database.
7. Run `npm run db:seed` if you want showcase reports available in production.
8. Confirm the cron schedule in `vercel.json` matches your Vercel plan limits.

## Architecture overview

- `src/app`
  App Router pages and API routes
- `src/components`
  UI primitives and product components
- `src/lib/analysis`
  Passive checks, scoring, and report generation
- `src/lib/data`
  Prisma-backed and demo-mode scan, workspace, job, and audit access
- `src/lib/pdf`
  PDF generation for exported reports
- `prisma`
  Schema and seed script

## Safety notes

- BreachVector does not attempt exploitation
- No brute force, fuzzing, or intrusive scanning
- All checks are passive or lightweight public requests
- The app is designed for student showcases and legal demo environments

## Remaining extensions

### Durable ops

- Move from app-managed dispatch to a dedicated queue or workflow system for stronger cross-instance durability
- Add scheduled dead-letter handling and replay tooling
- Add alerting around failed jobs and stale worker leases

### Teammates

- Add invite resend email delivery
- Add ownership transfer and stronger admin guardrails
- Add workspace-level comments or assignments on findings

### Observability

- Add external log drains, tracing, and dashboards
- Track queue latency and scan-stage timing in more detail
- Expose organization-wide audit exports

### Passive analysis

- Add richer DNS posture checks where they remain passive and legal
- Add smarter parsing for `security.txt` contacts and expiry warnings
- Add more nuanced header and cookie heuristics