import type { AuditEventAction } from "@/lib/types";
import { recordAuditEvent, countAuditEvents } from "@/lib/data/audit";

const globalForRateLimit = globalThis as typeof globalThis & {
  breachVectorRateLimitHits?: Map<string, number[]>;
};

const hitStore = globalForRateLimit.breachVectorRateLimitHits ?? new Map<string, number[]>();

if (!globalForRateLimit.breachVectorRateLimitHits) {
  globalForRateLimit.breachVectorRateLimitHits = hitStore;
}

function makeKey(action: AuditEventAction, actorUserId?: string | null, organizationId?: string | null) {
  return [action, actorUserId ?? "anon", organizationId ?? "global"].join(":");
}

export async function enforceRateLimit(input: {
  action: AuditEventAction;
  actorUserId?: string | null;
  organizationId?: string | null;
  limit: number;
  windowMs: number;
  detail: string;
}) {
  const since = new Date(Date.now() - input.windowMs);
  const databaseCount = await countAuditEvents({
    action: input.action,
    actorUserId: input.actorUserId,
    organizationId: input.organizationId,
    since
  });

  const key = makeKey(input.action, input.actorUserId, input.organizationId);
  const hits = (hitStore.get(key) ?? []).filter((timestamp) => timestamp >= since.getTime());
  hitStore.set(key, hits);

  const observedCount = Math.max(databaseCount, hits.length);

  if (observedCount >= input.limit) {
    await recordAuditEvent({
      actorUserId: input.actorUserId,
      organizationId: input.organizationId,
      action: "RATE_LIMIT_TRIGGERED",
      detail: input.detail,
      meta: {
        blockedAction: input.action,
        limit: input.limit,
        windowMs: input.windowMs
      }
    });

    throw new Error(`Rate limit reached for ${input.detail}. Please wait a minute and try again.`);
  }

  hits.push(Date.now());
  hitStore.set(key, hits);
}