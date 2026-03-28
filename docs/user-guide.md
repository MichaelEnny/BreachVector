# BreachVector Web App User Guide

This guide explains how to use BreachVector step by step, from opening the app for the first time to reviewing reports, managing workspaces, inviting teammates, exporting PDFs, and checking operations.

## 1. What BreachVector does

BreachVector is a passive website security review app.

You enter a domain or URL, and the app performs lightweight public-facing checks such as:

- HTTPS availability
- HTTP to HTTPS redirect behavior
- TLS certificate visibility and expiry when available
- common security headers
- visible cookie security flags
- DNS email-auth posture such as SPF, DMARC, MTA-STS, and CAA when resolvable
- public discovery files such as `robots.txt` and `security.txt`

It then turns those signals into:

- an overall score
- an executive summary
- technical findings
- remediation steps
- plain-English explanations

## 2. Before you start

BreachVector can run in two modes.

### Demo mode

Use this if you want the app to work without configuring every external service.

What works in demo mode:

- landing page
- analyze flow
- seeded showcase reports
- template-generated reports
- in-memory experience for demos

### Full mode

Use this if you want the complete product behavior.

What full mode adds:

- sign-in and ownership
- saved history in the database
- workspaces and teammates
- share links
- PDF export tracking
- durable scan jobs and operations visibility

## 3. Open the app

1. Start the app locally with `npm run dev`, or open the deployed Vercel URL.
2. Open the homepage.
3. You should see the branded BreachVector landing page.
4. At the top of the page, look at the header badges.

Those badges tell you whether:

- persistence is enabled
- identity is enabled
- the worker route is secured

If auth is not enabled, you can still explore the landing page and seeded/demo behavior.

## 4. Sign in

If Clerk is configured:

1. Click the sign-in button in the header.
2. Complete the sign-in or sign-up flow.
3. After signing in, return to the app.
4. Confirm that the header now shows your authenticated state.

When signed in, live scans belong to you and to your active workspace.

## 5. Understand workspaces

BreachVector uses workspaces to organize access and scan history.

There are two main workspace types:

- `PERSONAL`: your own private working area
- `TEAM`: a shared workspace for collaboration

The active workspace matters because:

- new scans are stored there
- teammates in that workspace may gain access to the same reports
- history and ops views are scoped to it

## 6. Switch workspaces

If you have more than one workspace:

1. Open the workspace switcher in the header.
2. Review the list of available workspaces.
3. Select the workspace you want to use.
4. Wait for the UI to refresh.
5. Confirm the active workspace badge in the header changes.

Use this before starting a scan so the result lands in the correct place.

## 7. Create a new team workspace

To create a workspace:

1. Open `/account`.
2. Find the workspace creation section.
3. Enter the workspace name.
4. Add an optional description if desired.
5. Submit the form.
6. Confirm the new workspace appears in your memberships list.
7. Switch into it if you want future scans to land there.

## 8. Run a scan

To analyze a site:

1. Go to the homepage.
2. Find the analyze form.
3. Enter either:
   - a bare domain like `example.com`
   - a full URL like `https://example.com`
4. Submit the form.
5. The app will normalize the target and create a scan job.
6. You will be redirected to a job status page.

Important behavior:

- the app performs only passive, lightweight public checks
- it does not brute-force, exploit, fuzz, or perform aggressive scanning
- if a very recent result already exists for the same workspace and target, the app may reuse it instead of running duplicate checks

## 9. Read the job status page

The job page shows the current state of scan execution.

You may see statuses such as:

- `QUEUED`
- `PROCESSING`
- `COMPLETED`
- `FAILED`

What to watch on this page:

- hostname and normalized URL
- attempt count
- worker claim information when present
- heartbeat and scheduling details
- current progress label

What happens next:

- if the job completes successfully, the page redirects to the report
- if a transient failure happens, the job may retry automatically
- if the job fails permanently, an error message is shown

## 10. Read the report page

When a scan is complete, BreachVector opens the report page.

The report is divided into product-friendly sections.

### Score area

This shows the overall score from `0` to `100`.

Higher means a stronger public-facing posture based on the passive signals the app was able to observe.

### Executive summary

This is written for non-technical readers.

Use this section when explaining the posture quickly to:

- judges
- recruiters
- founders
- classmates
- project reviewers

### Findings

This section highlights the most important issues found during the passive review.

Each finding includes:

- title
- severity
- summary
- evidence
- recommendation

### Remediation plan

This section organizes next steps by priority.

Use it to explain what should happen:

- immediately
- in the next sprint
- later in the backlog

### Plain-English explanations

This section translates security terms into simpler explanations.

It is useful when the audience is not deeply technical.

### Signal breakdown

This section shows the raw categories BreachVector observed, such as:

- HTTPS
- redirect behavior
- security headers
- cookie flags
- TLS info
- DNS email-auth posture
- discovery files like `robots.txt` and `security.txt`

## 11. Understand the findings severity levels

BreachVector uses severity labels to help prioritize work.

Typical meanings:

- `INFO`: useful context, but not usually urgent
- `LOW`: worthwhile hardening improvement
- `MEDIUM`: meaningful gap that should be addressed soon
- `HIGH`: important security weakness with higher priority
- `CRITICAL`: severe foundational issue

Use severity together with the recommendation and remediation plan, not by itself.

## 12. Export the report as PDF

To export a report:

1. Open a finished report.
2. Find the report actions area.
3. Click `Export PDF`.
4. Wait for the generated PDF download.
5. Open the file to confirm the exported layout looks correct.

The PDF is useful for:

- project submissions
- demo handoff
- recruiter sharing
- client-style presentations

## 13. Open the print view

To open the print-friendly version:

1. Open a finished report.
2. Click `Print view`.
3. Review the simplified report layout.
4. Use the browser print dialog if you want a browser-native print/export path.

## 14. Create a share link

To share a report:

1. Open a finished report.
2. Find the share controls.
3. Create or refresh a share link.
4. Choose the access model if the UI offers it.

There are two share styles:

- `PUBLIC`: anyone with the tokenized link can open it
- `PRIVATE`: the recipient must sign in before the report is shown

After the link is created:

1. Copy the link.
2. Open it in another browser or private window if you want to test it.
3. Confirm the access behavior matches the selected share mode.

## 15. View scan history

To open history:

1. Click `History` in the header, or go to `/history`.
2. Review the saved scans for the active workspace.
3. Open any scan from the list.
4. Switch workspaces if you want to view a different workspace’s history.

History is useful for:

- showing saved product state in a demo
- comparing recent reviews
- proving persistence and ownership

## 16. Use the account page

Open `/account` to manage your operator profile and workspace context.

What you can do there:

- review your profile information
- see your daily usage
- see your memberships
- create workspaces
- manage team membership and invites in team workspaces
- review recent workspace audit activity
- review your authored scans
- jump to the ops page

## 17. Invite teammates

If you are in a team workspace and your role allows it:

1. Open `/account`.
2. Scroll to the team management section.
3. Enter the teammate email.
4. Choose the role.
5. Create the invite.
6. Copy the invite link or send it through your normal communication channel.

Depending on your permissions, you may also be able to:

- refresh the invite token
- revoke the invite
- update member roles
- remove members

## 18. Accept an invite

To join a workspace from an invite link:

1. Open the invite URL.
2. Sign in if prompted.
3. Review the workspace and role information.
4. Accept the invite.
5. Return to the app.
6. Confirm the new workspace appears in your workspace switcher and account page.

## 19. Manage teammates

In a team workspace, the team manager UI can be used to:

- review current members
- see each member’s role
- promote or reduce roles when permitted
- remove a member when necessary
- review pending invites
- refresh or revoke invite links

Be careful with owner/admin roles. Those permissions affect access to scans, members, and shared assets.

## 20. Use the ops page

Open `/ops` to view operational health for the active workspace.

What you can see there:

- queued jobs
- processing jobs
- failures in the last 24 hours
- retries in the last 24 hours
- average runtime
- stale jobs
- recent job feed
- recent failures
- audit pulse

Use this page during demos to prove that BreachVector is not just a static UI. It has operational depth and job visibility.

## 21. Typical demo walkthrough

A strong live walkthrough usually follows this order:

1. Open the landing page.
2. Explain passive-only safe scanning.
3. Submit a scan.
4. Show the job status page.
5. Open the completed report.
6. Show findings, score, and remediation.
7. Export PDF or create a share link.
8. Open `/history`.
9. Open `/account`.
10. Open `/ops`.

If network conditions are unreliable, start from a seeded demo report and then show history, account, and ops.

## 22. What to do if something does not work

### If sign-in is missing

Check that these env vars are set:

- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- `CLERK_SECRET_KEY`

### If Prisma commands fail

Check that `.env` contains:

- `DATABASE_URL`
- `DIRECT_URL`

Remember that Prisma CLI typically reads `.env`, not just `.env.local`.

### If scans are not persisting

Check that:

1. Supabase is configured
2. `npm run prisma:push` has been run
3. the app is using the expected database values

### If the worker route is not processing jobs in production

Check that:

- `CRON_SECRET` or `JOB_WORKER_SECRET` is configured
- the deployment includes `vercel.json`
- the cron schedule is supported by your Vercel plan
- the internal route `/api/internal/jobs/process` is reachable and authorized

### If AI reports are not being generated

Check that:

- `OPENAI_API_KEY` is configured
- the selected `OPENAI_MODEL` is valid

If OpenAI is not configured, the app should still work using fallback report generation.

## 23. Recommended first-time user flow

If you are brand new to the product, use this order:

1. Sign in.
2. Open `/account`.
3. Confirm your personal workspace exists.
4. Create a team workspace if needed.
5. Switch to the workspace you want.
6. Run a scan from the homepage.
7. Wait for the job to complete.
8. Review the report.
9. Export the PDF.
10. Create a share link.
11. Open `/history` and `/ops`.

## 24. Good practices when using the app

- Scan only sites you are comfortable analyzing from a public passive perspective.
- Use the report as a review aid, not as a substitute for a full security audit.
- Reuse workspaces intentionally so team history stays organized.
- Use share links carefully, especially public ones.
- Check the ops page if jobs seem slow or flaky.

## 25. Summary

BreachVector is best used as a polished passive review workflow:

1. choose the correct workspace
2. submit a target
3. wait for the worker-backed job
4. review the report
5. share or export the result
6. manage history, teammates, and operations from the surrounding product surfaces

For demo presentation help, also see:

- [demo-script.md](./demo-script.md)
- [screenshot-shot-list.md](./screenshot-shot-list.md)
- [deployment-verification.md](./deployment-verification.md)