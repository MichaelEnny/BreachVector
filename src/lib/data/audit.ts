import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type { AuditEventAction, AuditEventRecord } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

const globalForAudit = globalThis as typeof globalThis & {
  breachVectorAuditEvents?: AuditEventRecord[];
};

const auditStore = globalForAudit.breachVectorAuditEvents ?? [];

if (!globalForAudit.breachVectorAuditEvents) {
  globalForAudit.breachVectorAuditEvents = auditStore;
}

function asJsonValue<T>(value: T) {
  return value as unknown as Prisma.InputJsonValue;
}

function fromAuditRecord(record: {
  id: string;
  actorUserId: string | null;
  organizationId: string | null;
  scanId: string | null;
  jobId: string | null;
  action: AuditEventAction;
  target: string | null;
  detail: string | null;
  meta: Prisma.JsonValue | null;
  createdAt: Date;
}) {
  return {
    id: record.id,
    actorUserId: record.actorUserId,
    organizationId: record.organizationId,
    scanId: record.scanId,
    jobId: record.jobId,
    action: record.action,
    target: record.target,
    detail: record.detail,
    meta: (record.meta as Record<string, unknown> | null) ?? null,
    createdAt: record.createdAt.toISOString()
  } satisfies AuditEventRecord;
}

export async function recordAuditEvent(input: {
  actorUserId?: string | null;
  organizationId?: string | null;
  scanId?: string | null;
  jobId?: string | null;
  action: AuditEventAction;
  target?: string | null;
  detail?: string | null;
  meta?: Record<string, unknown> | null;
}) {
  if (hasDatabase()) {
    try {
      const event = await prisma.auditEvent.create({
        data: {
          actorUserId: input.actorUserId ?? null,
          organizationId: input.organizationId ?? null,
          scanId: input.scanId ?? null,
          jobId: input.jobId ?? null,
          action: input.action,
          target: input.target ?? null,
          detail: input.detail ?? null,
          meta: input.meta ? asJsonValue(input.meta) : Prisma.JsonNull
        }
      });

      return fromAuditRecord(event);
    } catch (error) {
      console.error("Falling back to in-memory audit logging:", getErrorMessage(error));
    }
  }

  const event: AuditEventRecord = {
    id: crypto.randomUUID(),
    actorUserId: input.actorUserId ?? null,
    organizationId: input.organizationId ?? null,
    scanId: input.scanId ?? null,
    jobId: input.jobId ?? null,
    action: input.action,
    target: input.target ?? null,
    detail: input.detail ?? null,
    meta: input.meta ?? null,
    createdAt: new Date().toISOString()
  };

  auditStore.unshift(event);
  return event;
}

export async function getWorkspaceAuditEvents(organizationId: string, limit = 8) {
  if (hasDatabase()) {
    try {
      const events = await prisma.auditEvent.findMany({
        where: {
          organizationId
        },
        orderBy: {
          createdAt: "desc"
        },
        take: limit
      });

      return events.map(fromAuditRecord);
    } catch (error) {
      console.error("Falling back to in-memory workspace audit events:", getErrorMessage(error));
    }
  }

  return auditStore.filter((event) => event.organizationId === organizationId).slice(0, limit);
}

export async function countAuditEvents(input: {
  action: AuditEventAction;
  actorUserId?: string | null;
  organizationId?: string | null;
  since: Date;
}) {
  if (hasDatabase()) {
    try {
      return prisma.auditEvent.count({
        where: {
          action: input.action,
          actorUserId: input.actorUserId ?? undefined,
          organizationId: input.organizationId ?? undefined,
          createdAt: {
            gte: input.since
          }
        }
      });
    } catch (error) {
      console.error("Falling back to in-memory audit counts:", getErrorMessage(error));
    }
  }

  return auditStore.filter((event) => {
    return (
      event.action === input.action &&
      (input.actorUserId ? event.actorUserId === input.actorUserId : true) &&
      (input.organizationId ? event.organizationId === input.organizationId : true) &&
      new Date(event.createdAt).getTime() >= input.since.getTime()
    );
  }).length;
}