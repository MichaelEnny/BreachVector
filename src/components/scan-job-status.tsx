"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { AlertTriangle, ArrowRight, Clock3, LoaderCircle, Radar, RotateCcw, ShieldCheck, TimerReset } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ScanJobRecord } from "@/lib/types";

function badgeForStatus(status: ScanJobRecord["status"]) {
  switch (status) {
    case "COMPLETED":
      return "success" as const;
    case "FAILED":
      return "danger" as const;
    case "PROCESSING":
      return "accent" as const;
    default:
      return "warning" as const;
  }
}

function formatTimestamp(value: string | null) {
  if (!value) {
    return "Not available";
  }

  return new Date(value).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  });
}

function formatDuration(durationMs: number | null) {
  if (durationMs === null) {
    return "Pending";
  }

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function describeStatus(job: ScanJobRecord) {
  if (job.status === "FAILED") {
    return "The worker exhausted the passive review flow before a report could be generated.";
  }

  if (job.status === "COMPLETED") {
    return job.progressLabel ?? "The report is ready and this page will redirect automatically.";
  }

  if (job.status === "PROCESSING") {
    return job.progressLabel ?? "A worker has claimed the job and is stepping through passive analysis.";
  }

  if (job.progressLabel?.toLowerCase().includes("retry")) {
    return job.progressLabel;
  }

  return job.progressLabel ?? "The job is queued for a durable worker claim and will start as soon as capacity is available.";
}

function describeSchedule(job: ScanJobRecord) {
  if (job.status === "PROCESSING") {
    return job.leaseExpiresAt ? `Lease refresh expected by ${formatTimestamp(job.leaseExpiresAt)}` : "Lease active";
  }

  if (job.status === "QUEUED") {
    return `Eligible to run at ${formatTimestamp(job.availableAt)}`;
  }

  if (job.status === "COMPLETED") {
    return `Completed at ${formatTimestamp(job.completedAt)}`;
  }

  return `Last update ${formatTimestamp(job.lastHeartbeatAt ?? job.completedAt ?? job.createdAt)}`;
}

export function ScanJobStatus({ initialJob }: { initialJob: ScanJobRecord }) {
  const router = useRouter();
  const [job, setJob] = useState(initialJob);
  const [error, setError] = useState<string | null>(null);

  const refreshJob = useCallback(async () => {
    try {
      const response = await fetch(`/api/jobs/${job.id}`, {
        cache: "no-store"
      });
      const payload = (await response.json()) as { error?: string; job?: ScanJobRecord };

      if (!response.ok || !payload.job) {
        throw new Error(payload.error || "The scan job could not be loaded.");
      }

      setJob(payload.job);
      setError(null);

      if (payload.job.status === "COMPLETED" && payload.job.resultScanId) {
        router.replace(`/scans/${payload.job.resultScanId}`);
      }
    } catch (jobError) {
      setError(jobError instanceof Error ? jobError.message : "The scan job could not be loaded.");
    }
  }, [job.id, router]);

  useEffect(() => {
    if (job.status === "COMPLETED" && job.resultScanId) {
      router.replace(`/scans/${job.resultScanId}`);
      return;
    }

    if (job.status === "FAILED") {
      return;
    }

    void refreshJob();
    const timer = window.setInterval(() => {
      void refreshJob();
    }, 2000);

    return () => {
      window.clearInterval(timer);
    };
  }, [job.id, job.resultScanId, job.status, refreshJob, router]);

  return (
    <div className="grid gap-8 lg:grid-cols-[1.05fr_0.95fr]">
      <Card className="overflow-hidden">
        <CardContent className="p-8 md:p-10">
          <div className="flex items-center gap-3 text-cyan-100">
            {job.status === "FAILED" ? (
              <AlertTriangle className="h-5 w-5" />
            ) : job.status === "COMPLETED" ? (
              <ShieldCheck className="h-5 w-5" />
            ) : (
              <LoaderCircle className="h-5 w-5 animate-spin" />
            )}
            <div className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Durable scan job</div>
          </div>
          <h1 className="mt-4 font-heading text-4xl text-white md:text-5xl">{job.hostname}</h1>
          <p className="mt-3 text-sm text-white/50">{job.normalizedUrl}</p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Badge variant={badgeForStatus(job.status)}>{job.status.toLowerCase()}</Badge>
            <Badge variant="default">Attempt {job.attemptCount}</Badge>
            {job.workerId ? <Badge variant="accent">{job.workerId}</Badge> : null}
          </div>
          <p className="mt-8 max-w-2xl text-lg leading-8 text-white/68">{describeStatus(job)}</p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">Queued</div>
              <div className="mt-2 text-sm text-white/70">{formatTimestamp(job.createdAt)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">Schedule</div>
              <div className="mt-2 text-sm text-white/70">{describeSchedule(job)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">Heartbeat</div>
              <div className="mt-2 text-sm text-white/70">{formatTimestamp(job.lastHeartbeatAt)}</div>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="text-xs uppercase tracking-[0.22em] text-white/40">Runtime</div>
              <div className="mt-2 text-sm text-white/70">{formatDuration(job.durationMs)}</div>
            </div>
          </div>

          {job.status === "FAILED" && job.errorMessage ? (
            <div className="mt-6 rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {job.errorMessage}
            </div>
          ) : null}
          {error ? (
            <div className="mt-6 rounded-2xl border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
              {error}
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="grid gap-8">
        <Card className="bg-white/5">
          <CardHeader>
            <CardTitle>Worker execution model</CardTitle>
            <CardDescription>The queue now uses persisted claims, short leases, and retry scheduling.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-sm leading-6 text-white/60">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              A worker claims the job, refreshes its lease while passive checks are running, and releases the job only after the report is saved.
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              If a very recent result already exists for this workspace and target, BreachVector reuses it instead of re-running the same public checks.
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              If the worker fails, the job is re-queued with backoff until the attempt limit is reached. The ops surface tracks retries, stale leases, and failures.
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5">
          <CardHeader>
            <CardTitle>Controls</CardTitle>
            <CardDescription>Useful while the job is queued, processing, or if it needs review.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button type="button" onClick={() => void refreshJob()} variant="secondary">
              <Radar className="h-4 w-4" />
              Refresh status
            </Button>
            <Button asChild variant="secondary">
              <Link href={"/ops" as Route}>
                <TimerReset className="h-4 w-4" />
                Open ops
              </Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href={"/account" as Route}>
                <RotateCcw className="h-4 w-4" />
                Back to account
              </Link>
            </Button>
            <Button asChild>
              <Link href={"/" as Route}>
                Back to workspace
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card className="bg-white/5">
          <CardHeader>
            <CardTitle>Queue details</CardTitle>
            <CardDescription>Useful for debugging durable execution and scheduled pickup.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm text-white/60">
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <Clock3 className="h-4 w-4 text-cyan-100" />
                <span>Available to workers</span>
              </div>
              <span className="text-right text-white/72">{formatTimestamp(job.availableAt)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/10 bg-slate-950/40 p-4">
              <div className="flex items-center gap-3">
                <LoaderCircle className="h-4 w-4 text-cyan-100" />
                <span>Worker claim</span>
              </div>
              <span className="text-right text-white/72">{job.workerId ?? "Waiting for claim"}</span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}