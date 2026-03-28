import Link from "next/link";
import { AlertTriangle, ArrowRight, Clock3, Radar, RefreshCcw, ShieldCheck, TimerReset } from "lucide-react";

import { AuthDisabledCard } from "@/components/auth-disabled-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerContext } from "@/lib/auth";
import { getWorkspaceAuditEvents } from "@/lib/data/audit";
import { getWorkspaceObservabilitySnapshot } from "@/lib/data/jobs";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "Unknown";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

export default async function OpsPage() {
  const viewer = await getViewerContext();

  if (!viewer.authEnabled) {
    return (
      <main className="container py-16">
        <AuthDisabledCard />
      </main>
    );
  }

  if (!viewer.userId) {
    return null;
  }

  if (!viewer.activeWorkspace) {
    return (
      <main className="container py-16">
        <Card>
          <CardHeader>
            <CardTitle>No workspace selected</CardTitle>
            <CardDescription>Select a workspace before opening operations.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const [ops, auditEvents] = await Promise.all([
    getWorkspaceObservabilitySnapshot(viewer.activeWorkspace.id),
    getWorkspaceAuditEvents(viewer.activeWorkspace.id, 8)
  ]);

  return (
    <main className="container py-10 md:py-12">
      <section className="panel-strong surface-radial overflow-hidden p-7 md:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">
          <div>
            <div className="section-kicker">Observability</div>
            <h1 className="mt-4 text-balance font-heading text-4xl text-white md:text-6xl">{viewer.activeWorkspace.name} operations radar</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/66">
              Monitor queue pressure, retries, stale jobs, and recent failures for the active workspace.
            </p>
          </div>
          <Card className="bg-white/[0.05]">
            <CardHeader>
              <div className="section-kicker">Current health</div>
              <CardTitle className="mt-2">Worker-backed scan execution</CardTitle>
              <CardDescription>Queue claims, retries, and worker heartbeats are now persisted in the data layer.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <div className="intel-card">
                <div className="data-label">Average runtime</div>
                <div className="mt-2 font-heading text-3xl text-white">{formatDuration(ops.averageDurationMs)}</div>
              </div>
              <div className="intel-card">
                <div className="data-label">Stale jobs</div>
                <div className="mt-2 font-heading text-3xl text-white">{ops.staleJobs}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <Clock3 className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="data-label">Queued</div>
              <div className="mt-2 font-heading text-3xl text-white">{ops.queuedJobs}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <Radar className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="data-label">Processing</div>
              <div className="mt-2 font-heading text-3xl text-white">{ops.processingJobs}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <RefreshCcw className="h-5 w-5 text-amber-100" />
            </div>
            <div>
              <div className="data-label">Retries 24h</div>
              <div className="mt-2 font-heading text-3xl text-white">{ops.retryingJobs24h}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <AlertTriangle className="h-5 w-5 text-rose-100" />
            </div>
            <div>
              <div className="data-label">Failures 24h</div>
              <div className="mt-2 font-heading text-3xl text-white">{ops.failedJobs24h}</div>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 grid gap-8 lg:grid-cols-[1.04fr_0.96fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Recent job activity</div>
            <CardTitle className="mt-2">Queue and worker feed</CardTitle>
            <CardDescription>Most recent jobs for this workspace, including retries and result reuse.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {ops.recentJobs.length > 0 ? (
              ops.recentJobs.map((job) => (
                <div key={job.id} className="intel-card">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-heading text-lg text-white">{job.hostname}</div>
                      <div className="mt-1 text-sm text-white/55">{job.progressLabel ?? "No progress label"}</div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Badge variant={job.status === "FAILED" ? "danger" : job.status === "COMPLETED" ? "success" : job.status === "PROCESSING" ? "accent" : "warning"}>
                        {job.status.toLowerCase()}
                      </Badge>
                      <Badge>Attempt {job.attemptCount}</Badge>
                    </div>
                  </div>
                  <div className="mt-3 grid gap-3 text-sm text-white/60 sm:grid-cols-3">
                    <div>
                      <div className="data-label">Created</div>
                      <div className="mt-1">{formatDateTime(job.createdAt)}</div>
                    </div>
                    <div>
                      <div className="data-label">Worker</div>
                      <div className="mt-1">{job.workerId ?? "Waiting for claim"}</div>
                    </div>
                    <div>
                      <div className="data-label">Runtime</div>
                      <div className="mt-1">{formatDuration(job.durationMs)}</div>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="intel-card text-sm text-white/60">No recent jobs recorded for this workspace yet.</div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <div className="section-kicker">Failure review</div>
              <CardTitle className="mt-2">Recent failures</CardTitle>
              <CardDescription>Useful for triaging flaky targets, worker interruptions, or transient DNS/network issues.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {ops.recentFailures.length > 0 ? (
                ops.recentFailures.map((job) => (
                  <div key={job.id} className="intel-card border-rose-400/10 bg-rose-400/[0.04]">
                    <div className="font-medium text-white">{job.hostname}</div>
                    <div className="mt-2 text-sm text-white/60">{job.errorMessage ?? "No error message recorded."}</div>
                    <div className="mt-3 text-xs text-white/40">{formatDateTime(job.createdAt)}</div>
                  </div>
                ))
              ) : (
                <div className="intel-card text-sm text-white/60">No failed jobs recorded recently.</div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="section-kicker">Audit pulse</div>
              <CardTitle className="mt-2">Operational activity</CardTitle>
              <CardDescription>Latest workspace events across scans, shares, exports, and teammate operations.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {auditEvents.map((event) => (
                <div key={event.id} className="intel-card">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-white">{event.action.replaceAll("_", " ").toLowerCase()}</div>
                    <div className="text-xs text-white/35">{formatDateTime(event.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-white/60">{event.detail ?? event.target ?? "No detail recorded."}</div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8 flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/history">
            <ShieldCheck className="h-4 w-4" />
            Open workspace history
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/account">
            <TimerReset className="h-4 w-4" />
            Back to account
          </Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/">
            Run another scan
            <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </section>
    </main>
  );
}
