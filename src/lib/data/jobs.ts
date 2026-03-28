import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { runWebsiteSecurityReview } from "@/lib/analysis/run-scan";
import { countAuditEvents, recordAuditEvent } from "@/lib/data/audit";
import { hasDatabase } from "@/lib/env";
import { normalizeTarget } from "@/lib/domain";
import { prisma } from "@/lib/prisma";
import type { ScanJobRecord, StoredScan, WorkspaceObservabilitySnapshot } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

const JOB_DEDUPE_WINDOW_MS = 10 * 60 * 1000;
const RESULT_REUSE_WINDOW_MS = 10 * 60 * 1000;
const JOB_LEASE_MS = 45 * 1000;
const JOB_MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 20 * 1000;

type InternalJobRecord = ScanJobRecord & {
  leaseToken: string | null;
};

type PrismaJobRecord = Prisma.ScanJobGetPayload<{
  include: {
    resultScan: true;
  };
}>;

const globalForJobs = globalThis as typeof globalThis & {
  breachVectorJobs?: Map<string, InternalJobRecord>;
  breachVectorMemory?: Map<string, StoredScan>;
};

const jobStore = globalForJobs.breachVectorJobs ?? new Map<string, InternalJobRecord>();

if (!globalForJobs.breachVectorJobs) {
  globalForJobs.breachVectorJobs = jobStore;
}

function dedupeKeyFor(organizationId: string, normalizedUrl: string) {
  return `${organizationId}:${normalizedUrl.toLowerCase()}`;
}

function asIso(value: Date | string | null | undefined) {
  return value ? new Date(value).toISOString() : null;
}

function durationFrom(startedAt: string | null, completedAt: string) {
  if (!startedAt) {
    return null;
  }

  return Math.max(0, new Date(completedAt).getTime() - new Date(startedAt).getTime());
}

function fromJobRecord(
  record:
    | PrismaJobRecord
    | {
        id: string;
        ownerUserId: string;
        organizationId: string;
        targetInput: string;
        normalizedUrl: string;
        hostname: string;
        dedupeKey: string;
        status: "QUEUED" | "PROCESSING" | "COMPLETED" | "FAILED";
        progressLabel: string | null;
        errorMessage: string | null;
        attemptCount: number;
        resultScanId: string | null;
        availableAt: Date | string;
        leaseToken?: string | null;
        leaseExpiresAt: Date | string | null;
        workerId: string | null;
        createdAt: Date | string;
        startedAt: Date | string | null;
        completedAt: Date | string | null;
        lastHeartbeatAt: Date | string | null;
        durationMs: number | null;
      }
): InternalJobRecord {
  return {
    id: record.id,
    ownerUserId: record.ownerUserId,
    organizationId: record.organizationId,
    targetInput: record.targetInput,
    normalizedUrl: record.normalizedUrl,
    hostname: record.hostname,
    dedupeKey: record.dedupeKey,
    status: record.status,
    progressLabel: record.progressLabel ?? null,
    errorMessage: record.errorMessage ?? null,
    attemptCount: record.attemptCount,
    resultScanId: record.resultScanId ?? null,
    availableAt: new Date(record.availableAt).toISOString(),
    leaseToken: record.leaseToken ?? null,
    leaseExpiresAt: asIso(record.leaseExpiresAt),
    workerId: record.workerId ?? null,
    createdAt: new Date(record.createdAt).toISOString(),
    startedAt: asIso(record.startedAt),
    completedAt: asIso(record.completedAt),
    lastHeartbeatAt: asIso(record.lastHeartbeatAt),
    durationMs: record.durationMs ?? null
  } satisfies InternalJobRecord;
}

function toPublicJob(record: InternalJobRecord): ScanJobRecord {
  const { leaseToken: _leaseToken, ...job } = record;
  return job;
}

async function findRecentWorkspaceScan(organizationId: string, normalizedUrl: string) {
  const since = new Date(Date.now() - RESULT_REUSE_WINDOW_MS);

  if (hasDatabase()) {
    try {
      return await prisma.scan.findFirst({
        where: {
          organizationId,
          normalizedUrl,
          origin: "LIVE",
          createdAt: {
            gte: since
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });
    } catch (error) {
      console.error("Falling back to in-memory recent scan lookup:", getErrorMessage(error));
    }
  }

  return [...(globalForJobs.breachVectorMemory?.values() ?? [])]
    .filter((scan) => {
      return (
        scan.organizationId === organizationId &&
        scan.normalizedUrl === normalizedUrl &&
        scan.origin === "LIVE" &&
        new Date(scan.createdAt).getTime() >= since.getTime()
      );
    })
    .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null;
}

async function findActiveDedupeJob(organizationId: string, dedupeKey: string) {
  const since = new Date(Date.now() - JOB_DEDUPE_WINDOW_MS);

  if (hasDatabase()) {
    try {
      const job = await prisma.scanJob.findFirst({
        where: {
          organizationId,
          dedupeKey,
          status: {
            in: ["QUEUED", "PROCESSING"]
          },
          createdAt: {
            gte: since
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return job ? toPublicJob(fromJobRecord(job)) : null;
    } catch (error) {
      console.error("Falling back to in-memory job dedupe:", getErrorMessage(error));
    }
  }

  return (
    [...jobStore.values()]
      .filter((job) => {
        return (
          job.organizationId === organizationId &&
          job.dedupeKey === dedupeKey &&
          ["QUEUED", "PROCESSING"].includes(job.status) &&
          new Date(job.createdAt).getTime() >= since.getTime()
        );
      })
      .sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime())[0] ?? null
  );
}

async function getInternalScanJobById(jobId: string) {
  if (hasDatabase()) {
    try {
      const job = await prisma.scanJob.findUnique({
        where: {
          id: jobId
        },
        include: {
          resultScan: true
        }
      });

      return job ? fromJobRecord(job) : null;
    } catch (error) {
      console.error("Falling back to in-memory internal job lookup:", getErrorMessage(error));
    }
  }

  return jobStore.get(jobId) ?? null;
}

async function persistJobUpdate(
  jobId: string,
  data: Partial<InternalJobRecord>,
  options?: { leaseToken?: string | null }
) {
  if (hasDatabase()) {
    try {
      if (options?.leaseToken) {
        const result = await prisma.scanJob.updateMany({
          where: {
            id: jobId,
            leaseToken: options.leaseToken
          },
          data: {
            status: data.status,
            progressLabel: data.progressLabel,
            errorMessage: data.errorMessage,
            attemptCount: data.attemptCount,
            resultScanId: data.resultScanId,
            availableAt: data.availableAt ? new Date(data.availableAt) : undefined,
            leaseToken: data.leaseToken === undefined ? undefined : data.leaseToken,
            leaseExpiresAt:
              data.leaseExpiresAt === undefined
                ? undefined
                : data.leaseExpiresAt
                  ? new Date(data.leaseExpiresAt)
                  : null,
            workerId: data.workerId === undefined ? undefined : data.workerId,
            startedAt:
              data.startedAt === undefined
                ? undefined
                : data.startedAt
                  ? new Date(data.startedAt)
                  : null,
            completedAt:
              data.completedAt === undefined
                ? undefined
                : data.completedAt
                  ? new Date(data.completedAt)
                  : null,
            lastHeartbeatAt:
              data.lastHeartbeatAt === undefined
                ? undefined
                : data.lastHeartbeatAt
                  ? new Date(data.lastHeartbeatAt)
                  : null,
            durationMs: data.durationMs === undefined ? undefined : data.durationMs
          }
        });

        if (result.count === 0) {
          return null;
        }
      } else {
        await prisma.scanJob.update({
          where: {
            id: jobId
          },
          data: {
            status: data.status,
            progressLabel: data.progressLabel,
            errorMessage: data.errorMessage,
            attemptCount: data.attemptCount,
            resultScanId: data.resultScanId,
            availableAt: data.availableAt ? new Date(data.availableAt) : undefined,
            leaseToken: data.leaseToken === undefined ? undefined : data.leaseToken,
            leaseExpiresAt:
              data.leaseExpiresAt === undefined
                ? undefined
                : data.leaseExpiresAt
                  ? new Date(data.leaseExpiresAt)
                  : null,
            workerId: data.workerId === undefined ? undefined : data.workerId,
            startedAt:
              data.startedAt === undefined
                ? undefined
                : data.startedAt
                  ? new Date(data.startedAt)
                  : null,
            completedAt:
              data.completedAt === undefined
                ? undefined
                : data.completedAt
                  ? new Date(data.completedAt)
                  : null,
            lastHeartbeatAt:
              data.lastHeartbeatAt === undefined
                ? undefined
                : data.lastHeartbeatAt
                  ? new Date(data.lastHeartbeatAt)
                  : null,
            durationMs: data.durationMs === undefined ? undefined : data.durationMs
          }
        });
      }

      return await getInternalScanJobById(jobId);
    } catch (error) {
      console.error("Falling back to in-memory job update:", getErrorMessage(error));
    }
  }

  const current = jobStore.get(jobId);

  if (!current) {
    return null;
  }

  if (options?.leaseToken && current.leaseToken !== options.leaseToken) {
    return null;
  }

  const next: InternalJobRecord = {
    ...current,
    ...data,
    leaseToken: data.leaseToken === undefined ? current.leaseToken : data.leaseToken
  };

  jobStore.set(jobId, next);
  return next;
}

async function touchClaimedJob(job: InternalJobRecord, progressLabel?: string | null) {
  const now = new Date();
  return persistJobUpdate(
    job.id,
    {
      progressLabel: progressLabel ?? job.progressLabel,
      lastHeartbeatAt: now.toISOString(),
      leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS).toISOString()
    },
    { leaseToken: job.leaseToken }
  );
}

async function claimNextAvailableJob(workerId: string, organizationId?: string | null) {
  const now = new Date();

  if (hasDatabase()) {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      try {
        const candidate = await prisma.scanJob.findFirst({
          where: {
            organizationId: organizationId ?? undefined,
            attemptCount: {
              lt: JOB_MAX_ATTEMPTS
            },
            availableAt: {
              lte: now
            },
            OR: [
              { status: "QUEUED" },
              {
                status: "PROCESSING",
                leaseExpiresAt: {
                  lt: now
                }
              }
            ]
          },
          orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }]
        });

        if (!candidate) {
          return null;
        }

        const leaseToken = crypto.randomUUID();
        const result = await prisma.scanJob.updateMany({
          where: {
            id: candidate.id,
            attemptCount: {
              lt: JOB_MAX_ATTEMPTS
            },
            OR: [
              { status: "QUEUED" },
              {
                status: "PROCESSING",
                leaseExpiresAt: {
                  lt: now
                }
              }
            ]
          },
          data: {
            status: "PROCESSING",
            progressLabel:
              candidate.attemptCount > 0 ? "Retrying passive review" : "Worker claimed passive review",
            attemptCount: {
              increment: 1
            },
            errorMessage: null,
            availableAt: now,
            leaseToken,
            leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS),
            workerId,
            startedAt: candidate.startedAt ?? now,
            completedAt: null,
            lastHeartbeatAt: now
          }
        });

        if (result.count === 0) {
          continue;
        }

        const claimed = await prisma.scanJob.findUnique({
          where: {
            id: candidate.id
          },
          include: {
            resultScan: true
          }
        });

        if (!claimed) {
          return null;
        }

        return fromJobRecord(claimed);
      } catch (error) {
        console.error("Falling back to in-memory job claim:", getErrorMessage(error));
        break;
      }
    }
  }

  const candidate = [...jobStore.values()]
    .filter((job) => {
      const available = new Date(job.availableAt).getTime() <= now.getTime();
      const leaseExpired = job.leaseExpiresAt ? new Date(job.leaseExpiresAt).getTime() < now.getTime() : true;
      const statusEligible = job.status === "QUEUED" || (job.status === "PROCESSING" && leaseExpired);
      const withinAttempts = job.attemptCount < JOB_MAX_ATTEMPTS;
      const orgMatch = organizationId ? job.organizationId === organizationId : true;
      return available && statusEligible && withinAttempts && orgMatch;
    })
    .sort((left, right) => {
      return new Date(left.availableAt).getTime() - new Date(right.availableAt).getTime() || new Date(left.createdAt).getTime() - new Date(right.createdAt).getTime();
    })[0];

  if (!candidate) {
    return null;
  }

  const claimed: InternalJobRecord = {
    ...candidate,
    status: "PROCESSING",
    progressLabel: candidate.attemptCount > 0 ? "Retrying passive review" : "Worker claimed passive review",
    attemptCount: candidate.attemptCount + 1,
    errorMessage: null,
    leaseToken: crypto.randomUUID(),
    leaseExpiresAt: new Date(now.getTime() + JOB_LEASE_MS).toISOString(),
    workerId,
    startedAt: candidate.startedAt ?? now.toISOString(),
    completedAt: null,
    lastHeartbeatAt: now.toISOString()
  };

  jobStore.set(claimed.id, claimed);
  return claimed;
}

async function completeClaimedJob(
  job: InternalJobRecord,
  data: Partial<InternalJobRecord>
) {
  return persistJobUpdate(
    job.id,
    {
      ...data,
      leaseToken: null,
      leaseExpiresAt: null,
      workerId: null,
      lastHeartbeatAt: data.lastHeartbeatAt ?? new Date().toISOString()
    },
    { leaseToken: job.leaseToken }
  );
}

async function processClaimedJob(job: InternalJobRecord) {
  const claimDetail =
    job.attemptCount > 1
      ? `Retry attempt ${job.attemptCount} started on worker ${job.workerId ?? "local"}.`
      : `Scan job started on worker ${job.workerId ?? "local"}.`;

  await recordAuditEvent({
    actorUserId: job.ownerUserId,
    organizationId: job.organizationId,
    jobId: job.id,
    action: job.attemptCount > 1 ? "SCAN_RETRIED" : "SCAN_STARTED",
    target: job.normalizedUrl,
    detail: claimDetail,
    meta: {
      attemptCount: job.attemptCount,
      workerId: job.workerId
    }
  });

  try {
    const recentScan = await findRecentWorkspaceScan(job.organizationId, job.normalizedUrl);

    if (recentScan && recentScan.id !== job.resultScanId) {
      const completedAt = new Date().toISOString();
      const completed = await completeClaimedJob(job, {
        status: "COMPLETED",
        progressLabel: "Reused a recent result",
        resultScanId: recentScan.id,
        errorMessage: null,
        completedAt,
        durationMs: durationFrom(job.startedAt, completedAt)
      });

      await recordAuditEvent({
        actorUserId: job.ownerUserId,
        organizationId: job.organizationId,
        jobId: job.id,
        scanId: recentScan.id,
        action: "SCAN_REUSED",
        target: job.normalizedUrl,
        detail: "Recent workspace scan reused during worker processing."
      });

      return completed;
    }

    const scan = await runWebsiteSecurityReview(job.targetInput, job.ownerUserId, job.organizationId, {
      onProgress: async (label) => {
        await touchClaimedJob(job, label);
      }
    });

    const completedAt = new Date().toISOString();
    const completed = await completeClaimedJob(job, {
      status: "COMPLETED",
      progressLabel: "Report ready",
      resultScanId: scan.id,
      errorMessage: null,
      completedAt,
      durationMs: durationFrom(job.startedAt, completedAt)
    });

    await recordAuditEvent({
      actorUserId: job.ownerUserId,
      organizationId: job.organizationId,
      jobId: job.id,
      scanId: scan.id,
      action: "SCAN_COMPLETED",
      target: job.normalizedUrl,
      detail: "Scan job completed successfully.",
      meta: {
        attemptCount: job.attemptCount,
        durationMs: durationFrom(job.startedAt, completedAt)
      }
    });

    return completed;
  } catch (error) {
    const errorMessage = getErrorMessage(error);
    const willRetry = job.attemptCount < JOB_MAX_ATTEMPTS;
    const now = new Date();
    const retryAt = new Date(now.getTime() + RETRY_BACKOFF_MS * job.attemptCount);
    const finalState = await completeClaimedJob(job, {
      status: willRetry ? "QUEUED" : "FAILED",
      progressLabel: willRetry
        ? `Retry scheduled for ${retryAt.toLocaleTimeString()}`
        : "Scan failed",
      errorMessage,
      availableAt: willRetry ? retryAt.toISOString() : job.availableAt,
      completedAt: willRetry ? null : now.toISOString(),
      durationMs: willRetry ? null : durationFrom(job.startedAt, now.toISOString())
    });

    await recordAuditEvent({
      actorUserId: job.ownerUserId,
      organizationId: job.organizationId,
      jobId: job.id,
      action: willRetry ? "SCAN_RETRIED" : "SCAN_FAILED",
      target: job.normalizedUrl,
      detail: willRetry
        ? `Attempt ${job.attemptCount} failed. Retry scheduled.`
        : errorMessage,
      meta: {
        attemptCount: job.attemptCount,
        retryAt: willRetry ? retryAt.toISOString() : null,
        workerId: job.workerId
      }
    });

    return finalState;
  }
}

export async function createScanJob(input: {
  ownerUserId: string;
  organizationId: string;
  target: string;
}) {
  const normalized = normalizeTarget(input.target);
  const dedupeKey = dedupeKeyFor(input.organizationId, normalized.normalizedUrl);
  const existingJob = await findActiveDedupeJob(input.organizationId, dedupeKey);

  if (existingJob) {
    return existingJob;
  }

  const recentScan = await findRecentWorkspaceScan(input.organizationId, normalized.normalizedUrl);
  const now = new Date().toISOString();

  if (hasDatabase()) {
    try {
      const job = await prisma.scanJob.create({
        data: {
          ownerUserId: input.ownerUserId,
          organizationId: input.organizationId,
          targetInput: normalized.targetInput,
          normalizedUrl: normalized.normalizedUrl,
          hostname: normalized.hostname,
          dedupeKey,
          status: recentScan ? "COMPLETED" : "QUEUED",
          progressLabel: recentScan ? "Reused a recent result" : "Queued for durable worker review",
          resultScanId: recentScan?.id ?? null,
          availableAt: new Date(),
          completedAt: recentScan ? new Date() : null,
          durationMs: recentScan ? 0 : null
        },
        include: {
          resultScan: true
        }
      });

      await recordAuditEvent({
        actorUserId: input.ownerUserId,
        organizationId: input.organizationId,
        jobId: job.id,
        scanId: recentScan?.id ?? null,
        action: recentScan ? "SCAN_REUSED" : "SCAN_REQUESTED",
        target: normalized.normalizedUrl,
        detail: recentScan ? "Recent workspace scan reused instead of running a duplicate check." : "Scan job queued for worker processing."
      });

      return toPublicJob(fromJobRecord(job));
    } catch (error) {
      console.error("Falling back to in-memory job creation:", getErrorMessage(error));
    }
  }

  const job: InternalJobRecord = {
    id: crypto.randomUUID(),
    ownerUserId: input.ownerUserId,
    organizationId: input.organizationId,
    targetInput: normalized.targetInput,
    normalizedUrl: normalized.normalizedUrl,
    hostname: normalized.hostname,
    dedupeKey,
    status: recentScan ? "COMPLETED" : "QUEUED",
    progressLabel: recentScan ? "Reused a recent result" : "Queued for durable worker review",
    errorMessage: null,
    attemptCount: 0,
    resultScanId: recentScan?.id ?? null,
    availableAt: now,
    leaseToken: null,
    leaseExpiresAt: null,
    workerId: null,
    createdAt: now,
    startedAt: null,
    completedAt: recentScan ? now : null,
    lastHeartbeatAt: null,
    durationMs: recentScan ? 0 : null
  };

  jobStore.set(job.id, job);
  await recordAuditEvent({
    actorUserId: input.ownerUserId,
    organizationId: input.organizationId,
    jobId: job.id,
    scanId: recentScan?.id ?? null,
    action: recentScan ? "SCAN_REUSED" : "SCAN_REQUESTED",
    target: normalized.normalizedUrl,
    detail: recentScan ? "Recent workspace scan reused instead of running a duplicate check." : "Scan job queued for worker processing."
  });
  return toPublicJob(job);
}

export async function getScanJobById(jobId: string, viewerUserId?: string | null, viewerWorkspaceIds: string[] = []) {
  const job = await getInternalScanJobById(jobId);

  if (!job) {
    return null;
  }

  return job.ownerUserId === viewerUserId || viewerWorkspaceIds.includes(job.organizationId)
    ? toPublicJob(job)
    : null;
}

export async function dispatchScanJobs(input?: { batchSize?: number; organizationId?: string | null; workerId?: string }) {
  const batchSize = Math.max(1, Math.min(input?.batchSize ?? 1, 10));
  const workerId = input?.workerId ?? `worker-${crypto.randomUUID().slice(0, 8)}`;
  const processedJobs: ScanJobRecord[] = [];

  for (let index = 0; index < batchSize; index += 1) {
    const claimed = await claimNextAvailableJob(workerId, input?.organizationId ?? null);

    if (!claimed) {
      break;
    }

    const processed = await processClaimedJob(claimed);

    if (processed) {
      processedJobs.push(toPublicJob(processed));
    }
  }

  return {
    workerId,
    claimedCount: processedJobs.length,
    jobs: processedJobs
  };
}

export function kickScanJobs(batchSize = 1, organizationId?: string | null) {
  void dispatchScanJobs({ batchSize, organizationId: organizationId ?? null }).catch((error) => {
    console.error("Background worker dispatch failed:", getErrorMessage(error));
  });
}

export async function getWorkspaceObservabilitySnapshot(organizationId: string): Promise<WorkspaceObservabilitySnapshot> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const staleBefore = new Date(Date.now() - JOB_LEASE_MS);

  if (hasDatabase()) {
    try {
      const [queuedJobs, processingJobs, completedJobs24h, failedJobs24h, retryingJobs24h, staleJobs, durations, recentFailures, recentJobs] = await Promise.all([
        prisma.scanJob.count({
          where: {
            organizationId,
            status: "QUEUED"
          }
        }),
        prisma.scanJob.count({
          where: {
            organizationId,
            status: "PROCESSING"
          }
        }),
        prisma.scanJob.count({
          where: {
            organizationId,
            status: "COMPLETED",
            completedAt: {
              gte: since
            }
          }
        }),
        prisma.scanJob.count({
          where: {
            organizationId,
            status: "FAILED",
            createdAt: {
              gte: since
            }
          }
        }),
        countAuditEvents({
          action: "SCAN_RETRIED",
          organizationId,
          since
        }),
        prisma.scanJob.count({
          where: {
            organizationId,
            status: "PROCESSING",
            lastHeartbeatAt: {
              lt: staleBefore
            }
          }
        }),
        prisma.scanJob.findMany({
          where: {
            organizationId,
            status: "COMPLETED",
            durationMs: {
              not: null
            },
            completedAt: {
              gte: since
            }
          },
          select: {
            durationMs: true
          },
          take: 25,
          orderBy: {
            completedAt: "desc"
          }
        }),
        prisma.scanJob.findMany({
          where: {
            organizationId,
            status: "FAILED"
          },
          include: {
            resultScan: true
          },
          orderBy: {
            createdAt: "desc"
          },
          take: 5
        }),
        prisma.scanJob.findMany({
          where: {
            organizationId
          },
          include: {
            resultScan: true
          },
          orderBy: [{ createdAt: "desc" }],
          take: 6
        })
      ]);

      const durationValues = durations.map((item) => item.durationMs).filter((value): value is number => value !== null);

      return {
        queuedJobs,
        processingJobs,
        completedJobs24h,
        failedJobs24h,
        retryingJobs24h,
        staleJobs,
        averageDurationMs: durationValues.length > 0 ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length) : null,
        recentFailures: recentFailures.map((job) => toPublicJob(fromJobRecord(job))),
        recentJobs: recentJobs.map((job) => toPublicJob(fromJobRecord(job)))
      };
    } catch (error) {
      console.error("Falling back to in-memory observability snapshot:", getErrorMessage(error));
    }
  }

  const jobs = [...jobStore.values()].filter((job) => job.organizationId === organizationId);
  const durationValues = jobs
    .filter((job) => job.status === "COMPLETED" && job.durationMs !== null && new Date(job.completedAt ?? 0).getTime() >= since.getTime())
    .map((job) => job.durationMs as number);

  return {
    queuedJobs: jobs.filter((job) => job.status === "QUEUED").length,
    processingJobs: jobs.filter((job) => job.status === "PROCESSING").length,
    completedJobs24h: jobs.filter((job) => job.status === "COMPLETED" && new Date(job.completedAt ?? 0).getTime() >= since.getTime()).length,
    failedJobs24h: jobs.filter((job) => job.status === "FAILED" && new Date(job.createdAt).getTime() >= since.getTime()).length,
    retryingJobs24h: await countAuditEvents({ action: "SCAN_RETRIED", organizationId, since }),
    staleJobs: jobs.filter((job) => job.status === "PROCESSING" && new Date(job.lastHeartbeatAt ?? 0).getTime() < staleBefore.getTime()).length,
    averageDurationMs: durationValues.length > 0 ? Math.round(durationValues.reduce((sum, value) => sum + value, 0) / durationValues.length) : null,
    recentFailures: jobs.filter((job) => job.status === "FAILED").sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 5).map(toPublicJob),
    recentJobs: jobs.sort((left, right) => new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()).slice(0, 6).map(toPublicJob)
  };
}
