# BreachVector Demo Script

## 30-second opener

BreachVector is an AI-powered website security review app for safe, passive, public-facing checks. Instead of trying to exploit anything, it inspects lightweight signals like HTTPS posture, security headers, cookie flags, DNS email-auth records, and public disclosure files, then turns those findings into an executive-friendly and technical report.

## 3-4 minute live demo flow

### 1. Start on the landing page

Say:

"The product is positioned as a startup-grade security posture review tool. It is designed to feel usable by founders, recruiters, judges, and technical reviewers, not just security specialists."

Show:

- the branded landing page
- the analyze form
- the premium visual system
- the fact that the app stays demoable even without full infrastructure

### 2. Run a scan

Say:

"I can enter a domain or full URL, and the app creates a queued job for a safe passive review. It does not brute-force, fuzz, exploit, or perform intrusive scanning."

Recommended targets:

- one seeded demo report if you want a guaranteed polished walkthrough
- one real public site if your network and env are working reliably

Show:

- submit the scan
- the queued job page
- status polling
- retry/worker language if visible

### 3. Explain the worker-backed model

Say:

"Under the hood, scans are tracked as durable jobs with persisted state, retries, worker claims, and observability. That makes the product feel more like a real SaaS workflow than a single blocking API call."

Show:

- the job status page
- attempt count
- worker/lease details if present
- redirect into the finished report

### 4. Walk through the report

Say:

"The report is designed for two audiences at once: an executive summary for non-technical readers and a technical findings section for implementation follow-up."

Highlight:

- overall score
- executive summary
- top findings with severity
- remediation plan
- plain-English explanations
- passive signals such as HTTPS, headers, cookie flags, DNS posture, `robots.txt`, and `security.txt`

### 5. Show product depth

Say:

"This is not only a scanner result page. It includes ownership, workspaces, sharing, exports, and auditability."

Show:

- `/history`
- `/account`
- team workspace / members / invites
- `/ops`
- `Export PDF`
- share link flow

### 6. Close with architecture and safety

Say:

"The project uses Next.js 15 App Router, TypeScript, Tailwind, shadcn-style components, Prisma, Supabase Postgres, Clerk auth, OpenAI-generated reporting with fallback mode, and Vercel-ready deployment settings. The product intentionally stays on the safe side of legality by using passive checks only."

## Short judging version

If you only have 60-90 seconds:

1. Show landing page and analyze form.
2. Open a polished report.
3. Show score, findings, remediation, and share/export controls.
4. Open `/ops` or `/account` briefly to prove this is a full product, not a static mock.
5. End by stressing passive-only legal-safe analysis.

## Talking points if asked technical questions

### Why AI here?

AI is not used to invent vulnerabilities or scan aggressively. It translates deterministic passive signals into a clearer narrative report and remediation plan.

### Why is this safe?

The app only performs lightweight public checks such as HTTPS reachability, redirects, visible headers, visible cookie attributes, public DNS records, and public disclosure files.

### Why does this stand out as a project?

Because it combines product design, full-stack engineering, AI integration, background job concepts, auth, workspace collaboration, exports, and operations visibility in one coherent app.

## Backup plan if live scanning is flaky

If network conditions are unreliable during judging:

1. Start from a seeded demo report.
2. Show `/history`, `/account`, and `/ops`.
3. Explain that the app has deterministic fallback mode so the product remains demoable even without all external services.