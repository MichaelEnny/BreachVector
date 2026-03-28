# Deployment Verification

## What was verified in this workspace

Verified locally on 2026-03-27:

- `npx prisma generate`
- `npm run lint`
- `npx tsc --noEmit`
- `npm run build`

Result:

- The app compiles successfully.
- Type checking passes.
- The current Prisma client matches the checked-in schema.
- The Next.js production build succeeds.
- `vercel.json` exists and includes a cron entry for `/api/internal/jobs/process`.
- `.env.example` includes database, Clerk, OpenAI, and worker/cron secret variables.

## What was not verified live from this session

The repo is not linked locally through `.vercel/project.json`, and the Vercel connector in this session is not authenticated, so I could not verify a real hosted deployment or inspect deployment logs from here.

## Manual live deployment checklist

1. Import the repo into Vercel.
2. Add environment variables from `.env.example`.
3. Ensure `DATABASE_URL` and `DIRECT_URL` point to the intended Supabase project.
4. Set `CRON_SECRET` or `JOB_WORKER_SECRET`.
5. Run `npm run prisma:push` against the production database.
6. Run `npm run db:seed` if you want showcase reports in production.
7. Confirm these routes manually after deploy:
   - `/`
   - `/history`
   - `/account`
   - `/ops`
   - `/sign-in`
8. Create one live scan and confirm the flow:
   - analyze request creates a job
   - `/jobs/[id]` updates
   - job resolves into `/scans/[id]`
9. Export one PDF and create one share link.
10. Confirm the cron or scheduler is hitting `/api/internal/jobs/process`.

## Recommendation before submission

For a class, hackathon, or portfolio submission, the current repo state is strong enough. The only remaining proof step worth doing on your machine is a real Vercel deploy plus one end-to-end live scan in the hosted environment.