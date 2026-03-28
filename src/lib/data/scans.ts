import crypto from "node:crypto";

import { Prisma } from "@prisma/client";

import { demoScans } from "@/lib/demo-data";
import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type {
  FindingRecord,
  MembershipRecord,
  OrganizationRecord,
  ReportExportRecord,
  ReportRecord,
  ScanOrigin,
  ShareAccess,
  ShareLinkRecord,
  SignalSnapshot,
  StoredScan,
  WorkspaceSummary
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

const globalForMemory = globalThis as typeof globalThis & {
  breachVectorMemory?: Map<string, StoredScan>;
  breachVectorSharesByScan?: Map<string, ShareLinkRecord>;
  breachVectorSharesByToken?: Map<string, ShareLinkRecord>;
  breachVectorExports?: ReportExportRecord[];
  breachVectorOrganizations?: Map<string, OrganizationRecord>;
  breachVectorMemberships?: Map<string, MembershipRecord>;
};

const memoryStore = globalForMemory.breachVectorMemory ?? new Map<string, StoredScan>();
const shareByScanStore = globalForMemory.breachVectorSharesByScan ?? new Map<string, ShareLinkRecord>();
const shareByTokenStore = globalForMemory.breachVectorSharesByToken ?? new Map<string, ShareLinkRecord>();
const exportStore = globalForMemory.breachVectorExports ?? [];
const organizationStore = globalForMemory.breachVectorOrganizations ?? new Map<string, OrganizationRecord>();
const membershipStore = globalForMemory.breachVectorMemberships ?? new Map<string, MembershipRecord>();

if (!globalForMemory.breachVectorMemory) {
  globalForMemory.breachVectorMemory = memoryStore;
}

if (!globalForMemory.breachVectorSharesByScan) {
  globalForMemory.breachVectorSharesByScan = shareByScanStore;
}

if (!globalForMemory.breachVectorSharesByToken) {
  globalForMemory.breachVectorSharesByToken = shareByTokenStore;
}

if (!globalForMemory.breachVectorExports) {
  globalForMemory.breachVectorExports = exportStore;
}

if (!globalForMemory.breachVectorOrganizations) {
  globalForMemory.breachVectorOrganizations = organizationStore;
}

if (!globalForMemory.breachVectorMemberships) {
  globalForMemory.breachVectorMemberships = membershipStore;
}

type PrismaScanRecord = Prisma.ScanGetPayload<{
  include: {
    findings: true;
    report: true;
    shareLink: true;
    organization: {
      include: {
        memberships: true;
        _count: {
          select: {
            memberships: true;
            scans: true;
          };
        };
      };
    };
    _count: {
      select: {
        exports: true;
      };
    };
  };
}>;

function asJsonValue<T>(value: T) {
  return value as unknown as Prisma.InputJsonValue;
}

function makeShareToken() {
  return crypto.randomBytes(18).toString("base64url");
}

function fromShareRecord(record: PrismaScanRecord["shareLink"]): ShareLinkRecord | null {
  if (!record) {
    return null;
  }

  return {
    id: record.id,
    scanId: record.scanId,
    ownerUserId: record.ownerUserId,
    token: record.token,
    access: record.access,
    accessCount: record.accessCount,
    lastAccessedAt: record.lastAccessedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
    revokedAt: record.revokedAt?.toISOString() ?? null
  };
}

function getMemoryWorkspaceSummary(organizationId: string | null | undefined, viewerUserId?: string | null) {
  if (!organizationId || !viewerUserId) {
    return null;
  }

  const organization = organizationStore.get(organizationId);
  const membership = [...membershipStore.values()].find(
    (candidate) => candidate.organizationId === organizationId && candidate.userId === viewerUserId
  );

  if (!organization || !membership) {
    return null;
  }

  return {
    ...organization,
    membershipId: membership.id,
    role: membership.role,
    memberCount: [...membershipStore.values()].filter(
      (candidate) => candidate.organizationId === organizationId
    ).length,
    scanCount: [...memoryStore.values()].filter((scan) => scan.organizationId === organizationId).length
  } satisfies WorkspaceSummary;
}

function fromPrismaWorkspaceSummary(
  organization: PrismaScanRecord["organization"],
  viewerUserId?: string | null
) {
  if (!organization || !viewerUserId) {
    return null;
  }

  const membership = organization.memberships.find((candidate) => candidate.userId === viewerUserId);

  if (!membership) {
    return null;
  }

  return {
    id: organization.id,
    slug: organization.slug,
    name: organization.name,
    type: organization.type,
    description: organization.description,
    createdByUserId: organization.createdByUserId,
    createdAt: organization.createdAt.toISOString(),
    updatedAt: organization.updatedAt.toISOString(),
    membershipId: membership.id,
    role: membership.role,
    memberCount: organization._count.memberships,
    scanCount: organization._count.scans
  } satisfies WorkspaceSummary;
}

function normalizeSignalSnapshot(
  rawSnapshot: unknown,
  fallback: { normalizedUrl: string; hostname: string }
): SignalSnapshot {
  const snapshot = rawSnapshot && typeof rawSnapshot === "object" ? (rawSnapshot as Record<string, unknown>) : {};
  const headers = snapshot.headers && typeof snapshot.headers === "object"
    ? (snapshot.headers as Record<string, unknown>)
    : {};
  const cookieSnapshot = snapshot.cookieSnapshot && typeof snapshot.cookieSnapshot === "object"
    ? (snapshot.cookieSnapshot as Record<string, unknown>)
    : {};
  const tls = snapshot.tls && typeof snapshot.tls === "object"
    ? (snapshot.tls as Record<string, unknown>)
    : {};
  const dnsAuth = snapshot.dnsAuth && typeof snapshot.dnsAuth === "object"
    ? (snapshot.dnsAuth as Record<string, unknown>)
    : {};
  const discovery = snapshot.discovery && typeof snapshot.discovery === "object"
    ? (snapshot.discovery as Record<string, unknown>)
    : {};
  const robotsTxt = discovery.robotsTxt && typeof discovery.robotsTxt === "object"
    ? (discovery.robotsTxt as Record<string, unknown>)
    : {};
  const securityTxt = discovery.securityTxt && typeof discovery.securityTxt === "object"
    ? (discovery.securityTxt as Record<string, unknown>)
    : {};

  return {
    normalizedUrl:
      typeof snapshot.normalizedUrl === "string" ? snapshot.normalizedUrl : fallback.normalizedUrl,
    hostname: typeof snapshot.hostname === "string" ? snapshot.hostname : fallback.hostname,
    httpsReachable: Boolean(snapshot.httpsReachable),
    httpRedirectToHttps: Boolean(snapshot.httpRedirectToHttps),
    httpStatus: typeof snapshot.httpStatus === "number" ? snapshot.httpStatus : null,
    httpsStatus: typeof snapshot.httpsStatus === "number" ? snapshot.httpsStatus : null,
    headers: {
      "content-security-policy": typeof headers["content-security-policy"] === "string" ? headers["content-security-policy"] : null,
      "strict-transport-security": typeof headers["strict-transport-security"] === "string" ? headers["strict-transport-security"] : null,
      "x-frame-options": typeof headers["x-frame-options"] === "string" ? headers["x-frame-options"] : null,
      "x-content-type-options": typeof headers["x-content-type-options"] === "string" ? headers["x-content-type-options"] : null,
      "referrer-policy": typeof headers["referrer-policy"] === "string" ? headers["referrer-policy"] : null
    },
    cookieSnapshot: {
      totalVisible: typeof cookieSnapshot.totalVisible === "number" ? cookieSnapshot.totalVisible : 0,
      secureCount: typeof cookieSnapshot.secureCount === "number" ? cookieSnapshot.secureCount : 0,
      httpOnlyCount: typeof cookieSnapshot.httpOnlyCount === "number" ? cookieSnapshot.httpOnlyCount : 0,
      sameSiteCount: typeof cookieSnapshot.sameSiteCount === "number" ? cookieSnapshot.sameSiteCount : 0,
      insecureCookies: Array.isArray(cookieSnapshot.insecureCookies)
        ? cookieSnapshot.insecureCookies.filter((item): item is string => typeof item === "string")
        : [],
      sampleCookies: Array.isArray(cookieSnapshot.sampleCookies)
        ? cookieSnapshot.sampleCookies.filter((item): item is string => typeof item === "string")
        : []
    },
    tls: {
      reachable: typeof tls.reachable === "boolean" ? tls.reachable : false,
      validTo: typeof tls.validTo === "string" ? tls.validTo : null,
      daysRemaining: typeof tls.daysRemaining === "number" ? tls.daysRemaining : null,
      expired: typeof tls.expired === "boolean" ? tls.expired : false,
      error: typeof tls.error === "string" ? tls.error : null
    },
    dnsAuth: {
      spf: typeof dnsAuth.spf === "boolean" ? dnsAuth.spf : null,
      dmarc: typeof dnsAuth.dmarc === "boolean" ? dnsAuth.dmarc : null,
      spfRecord: typeof dnsAuth.spfRecord === "string" ? dnsAuth.spfRecord : null,
      dmarcRecord: typeof dnsAuth.dmarcRecord === "string" ? dnsAuth.dmarcRecord : null,
      mtaSts: typeof dnsAuth.mtaSts === "boolean" ? dnsAuth.mtaSts : null,
      mtaStsRecord: typeof dnsAuth.mtaStsRecord === "string" ? dnsAuth.mtaStsRecord : null,
      caaPresent: typeof dnsAuth.caaPresent === "boolean" ? dnsAuth.caaPresent : null,
      caaRecords: Array.isArray(dnsAuth.caaRecords)
        ? dnsAuth.caaRecords.filter((item): item is string => typeof item === "string")
        : []
    },
    discovery: {
      robotsTxt: {
        reachable: typeof robotsTxt.reachable === "boolean" ? robotsTxt.reachable : false,
        status: typeof robotsTxt.status === "number" ? robotsTxt.status : null,
        location: typeof robotsTxt.location === "string" ? robotsTxt.location : null
      },
      securityTxt: {
        reachable: typeof securityTxt.reachable === "boolean" ? securityTxt.reachable : false,
        status: typeof securityTxt.status === "number" ? securityTxt.status : null,
        location: typeof securityTxt.location === "string" ? securityTxt.location : null,
        canonicalUrl: typeof securityTxt.canonicalUrl === "string" ? securityTxt.canonicalUrl : null,
        contactLines: Array.isArray(securityTxt.contactLines)
          ? securityTxt.contactLines.filter((item): item is string => typeof item === "string")
          : [],
        expires: typeof securityTxt.expires === "string" ? securityTxt.expires : null,
        source:
          securityTxt.source === "well-known" || securityTxt.source === "root"
            ? securityTxt.source
            : null
      }
    },
    responseNotes: Array.isArray(snapshot.responseNotes)
      ? snapshot.responseNotes.filter((item): item is string => typeof item === "string")
      : []
  };
}

function fromPrismaRecord(record: PrismaScanRecord, viewerUserId?: string | null): StoredScan {
  return {
    id: record.id,
    ownerUserId: record.ownerUserId,
    organizationId: record.organizationId,
    workspace: fromPrismaWorkspaceSummary(record.organization, viewerUserId),
    targetInput: record.targetInput,
    normalizedUrl: record.normalizedUrl,
    hostname: record.hostname,
    origin: record.origin,
    status: record.status,
    overallScore: record.overallScore,
    executiveSummary: record.executiveSummary,
    signalSnapshot: normalizeSignalSnapshot(record.signalSnapshot, { normalizedUrl: record.normalizedUrl, hostname: record.hostname }),
    errorMessage: record.errorMessage,
    createdAt: record.createdAt.toISOString(),
    completedAt: record.completedAt?.toISOString() ?? null,
    findings: record.findings.map((finding) => ({
      title: finding.title,
      severity: finding.severity,
      category: finding.category,
      summary: finding.summary,
      evidence: finding.evidence,
      recommendation: finding.recommendation,
      displayOrder: finding.displayOrder
    })),
    report: {
      technicalNarrative: record.report?.technicalNarrative ?? "",
      remediationPlan:
        (record.report?.remediationPlan as unknown as ReportRecord["remediationPlan"]) ?? [],
      plainEnglish: (record.report?.plainEnglish as unknown as ReportRecord["plainEnglish"]) ?? [],
      generatedByAi: record.report?.generatedByAi ?? false
    },
    shareLink: fromShareRecord(record.shareLink),
    exportCount: record._count.exports
  };
}

function sortScans(scans: StoredScan[]) {
  return [...scans].sort((left, right) => {
    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
  });
}

function getMemoryExportCount(scanId: string) {
  return exportStore.filter((item) => item.scanId === scanId).length;
}

function attachMemoryActivity(scan: StoredScan, viewerUserId?: string | null): StoredScan {
  return {
    ...scan,
    workspace: getMemoryWorkspaceSummary(scan.organizationId, viewerUserId),
    shareLink: shareByScanStore.get(scan.id) ?? null,
    exportCount: getMemoryExportCount(scan.id)
  };
}

function activeMemoryShare(token: string) {
  const share = shareByTokenStore.get(token);

  if (!share || share.revokedAt) {
    return null;
  }

  return share;
}

function hasScanAccess(scan: { origin: ScanOrigin; ownerUserId?: string | null; organizationId?: string | null }, viewerUserId?: string | null, viewerWorkspaceIds: string[] = []) {
  if (scan.origin === "DEMO") {
    return true;
  }

  if (scan.organizationId && viewerWorkspaceIds.includes(scan.organizationId)) {
    return true;
  }

  return Boolean(viewerUserId && scan.ownerUserId === viewerUserId);
}

async function findWorkspaceMembership(userId: string, organizationId: string) {
  if (hasDatabase()) {
    try {
      return await prisma.membership.findUnique({
        where: {
          organizationId_userId: {
            organizationId,
            userId
          }
        }
      });
    } catch (error) {
      console.error("Falling back to in-memory membership lookup:", getErrorMessage(error));
    }
  }

  return [...membershipStore.values()].find(
    (membership) => membership.organizationId === organizationId && membership.userId === userId
  ) ?? null;
}

export async function getShowcaseScans(limit = 6) {
  if (hasDatabase()) {
    try {
      const records = await prisma.scan.findMany({
        where: {
          origin: "DEMO"
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          findings: {
            orderBy: {
              displayOrder: "asc"
            }
          },
          report: true,
          shareLink: true,
          organization: {
            include: {
              memberships: true,
              _count: {
                select: {
                  memberships: true,
                  scans: true
                }
              }
            }
          },
          _count: {
            select: {
              exports: true
            }
          }
        },
        take: limit
      });

      return records.map((record) => fromPrismaRecord(record));
    } catch (error) {
      console.error("Falling back to demo scan history:", getErrorMessage(error));
    }
  }

  return sortScans(demoScans.map((scan) => attachMemoryActivity(scan))).slice(0, limit);
}

export async function getUserScans(userId: string, limit = 12) {
  if (hasDatabase()) {
    try {
      const records = await prisma.scan.findMany({
        where: {
          ownerUserId: userId
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          findings: {
            orderBy: {
              displayOrder: "asc"
            }
          },
          report: true,
          shareLink: true,
          organization: {
            include: {
              memberships: true,
              _count: {
                select: {
                  memberships: true,
                  scans: true
                }
              }
            }
          },
          _count: {
            select: {
              exports: true
            }
          }
        },
        take: limit
      });

      return records.map((record) => fromPrismaRecord(record, userId));
    } catch (error) {
      console.error("Falling back to in-memory user scan history:", getErrorMessage(error));
    }
  }

  return sortScans(
    [...memoryStore.values()].filter((scan) => scan.ownerUserId === userId).map((scan) => attachMemoryActivity(scan, userId))
  ).slice(0, limit);
}

export async function getWorkspaceScans(organizationId: string, viewerUserId: string, limit = 24) {
  const membership = await findWorkspaceMembership(viewerUserId, organizationId);

  if (!membership) {
    return [];
  }

  if (hasDatabase()) {
    try {
      const records = await prisma.scan.findMany({
        where: {
          organizationId
        },
        orderBy: {
          createdAt: "desc"
        },
        include: {
          findings: {
            orderBy: {
              displayOrder: "asc"
            }
          },
          report: true,
          shareLink: true,
          organization: {
            include: {
              memberships: true,
              _count: {
                select: {
                  memberships: true,
                  scans: true
                }
              }
            }
          },
          _count: {
            select: {
              exports: true
            }
          }
        },
        take: limit
      });

      return records.map((record) => fromPrismaRecord(record, viewerUserId));
    } catch (error) {
      console.error("Falling back to in-memory workspace scan history:", getErrorMessage(error));
    }
  }

  return sortScans(
    [...memoryStore.values()]
      .filter((scan) => scan.organizationId === organizationId)
      .map((scan) => attachMemoryActivity(scan, viewerUserId))
  ).slice(0, limit);
}

export async function getUserDailyScanCount(userId: string) {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);

  if (hasDatabase()) {
    try {
      return prisma.scan.count({
        where: {
          ownerUserId: userId,
          origin: "LIVE",
          createdAt: {
            gte: since
          }
        }
      });
    } catch (error) {
      console.error("Falling back to in-memory usage count:", getErrorMessage(error));
    }
  }

  return [...memoryStore.values()].filter((scan) => {
    return (
      scan.ownerUserId === userId &&
      scan.origin === "LIVE" &&
      new Date(scan.createdAt).getTime() >= since.getTime()
    );
  }).length;
}

export async function getScanById(id: string, viewerUserId?: string | null, viewerWorkspaceIds: string[] = []) {
  if (hasDatabase()) {
    try {
      const record = await prisma.scan.findUnique({
        where: { id },
        include: {
          findings: {
            orderBy: {
              displayOrder: "asc"
            }
          },
          report: true,
          shareLink: true,
          organization: {
            include: {
              memberships: true,
              _count: {
                select: {
                  memberships: true,
                  scans: true
                }
              }
            }
          },
          _count: {
            select: {
              exports: true
            }
          }
        }
      });

      if (record && hasScanAccess(record, viewerUserId, viewerWorkspaceIds)) {
        return fromPrismaRecord(record, viewerUserId);
      }
    } catch (error) {
      console.error("Falling back to demo scan lookup:", getErrorMessage(error));
    }
  }

  const memoryScan = memoryStore.get(id);

  if (memoryScan && hasScanAccess(memoryScan, viewerUserId, viewerWorkspaceIds)) {
    return attachMemoryActivity(memoryScan, viewerUserId);
  }

  const demoScan = demoScans.find((scan) => scan.id === id);
  return demoScan ? attachMemoryActivity(demoScan, viewerUserId) : null;
}

export async function createStoredScan(input: {
  ownerUserId: string;
  organizationId: string;
  targetInput: string;
  normalizedUrl: string;
  hostname: string;
  origin?: ScanOrigin;
  overallScore: number;
  executiveSummary: string;
  signalSnapshot: SignalSnapshot;
  findings: FindingRecord[];
  report: ReportRecord;
  errorMessage?: string | null;
}) {
  const completedAt = new Date();

  if (hasDatabase()) {
    try {
      const record = await prisma.scan.create({
        data: {
          ownerUserId: input.ownerUserId,
          organizationId: input.organizationId,
          targetInput: input.targetInput,
          normalizedUrl: input.normalizedUrl,
          hostname: input.hostname,
          origin: input.origin ?? "LIVE",
          status: "COMPLETED",
          overallScore: input.overallScore,
          executiveSummary: input.executiveSummary,
          signalSnapshot: asJsonValue(input.signalSnapshot),
          errorMessage: input.errorMessage ?? null,
          completedAt,
          findings: {
            create: input.findings.map((finding) => ({
              title: finding.title,
              severity: finding.severity,
              category: finding.category,
              summary: finding.summary,
              evidence: finding.evidence ?? null,
              recommendation: finding.recommendation,
              displayOrder: finding.displayOrder
            }))
          },
          report: {
            create: {
              technicalNarrative: input.report.technicalNarrative,
              remediationPlan: asJsonValue(input.report.remediationPlan),
              plainEnglish: asJsonValue(input.report.plainEnglish),
              generatedByAi: input.report.generatedByAi
            }
          }
        },
        include: {
          findings: {
            orderBy: {
              displayOrder: "asc"
            }
          },
          report: true,
          shareLink: true,
          organization: {
            include: {
              memberships: true,
              _count: {
                select: {
                  memberships: true,
                  scans: true
                }
              }
            }
          },
          _count: {
            select: {
              exports: true
            }
          }
        }
      });

      return fromPrismaRecord(record, input.ownerUserId);
    } catch (error) {
      console.error("Falling back to in-memory scan persistence:", getErrorMessage(error));
    }
  }

  const storedScan: StoredScan = {
    id: crypto.randomUUID(),
    ownerUserId: input.ownerUserId,
    organizationId: input.organizationId,
    workspace: getMemoryWorkspaceSummary(input.organizationId, input.ownerUserId),
    targetInput: input.targetInput,
    normalizedUrl: input.normalizedUrl,
    hostname: input.hostname,
    origin: input.origin ?? "LIVE",
    status: "COMPLETED",
    overallScore: input.overallScore,
    executiveSummary: input.executiveSummary,
    signalSnapshot: input.signalSnapshot,
    errorMessage: input.errorMessage ?? null,
    createdAt: completedAt.toISOString(),
    completedAt: completedAt.toISOString(),
    findings: input.findings,
    report: input.report,
    shareLink: null,
    exportCount: 0
  };

  memoryStore.set(storedScan.id, storedScan);
  return storedScan;
}

export async function upsertShareForScan(scanId: string, actorUserId: string, access: ShareAccess) {
  if (hasDatabase()) {
    try {
      const existing = await prisma.scanShare.findUnique({
        where: {
          scanId
        }
      });

      const share = await prisma.scanShare.upsert({
        where: {
          scanId
        },
        update: {
          ownerUserId: actorUserId,
          access,
          revokedAt: null,
          token: existing?.revokedAt ? makeShareToken() : existing?.token ?? makeShareToken()
        },
        create: {
          scanId,
          ownerUserId: actorUserId,
          access,
          token: makeShareToken()
        }
      });

      return {
        id: share.id,
        scanId: share.scanId,
        ownerUserId: share.ownerUserId,
        token: share.token,
        access: share.access,
        accessCount: share.accessCount,
        lastAccessedAt: share.lastAccessedAt?.toISOString() ?? null,
        createdAt: share.createdAt.toISOString(),
        updatedAt: share.updatedAt.toISOString(),
        revokedAt: null
      } satisfies ShareLinkRecord;
    } catch (error) {
      console.error("Falling back to in-memory share upsert:", getErrorMessage(error));
    }
  }

  const now = new Date().toISOString();
  const existing = shareByScanStore.get(scanId);
  const share: ShareLinkRecord = existing
    ? {
        ...existing,
        ownerUserId: actorUserId,
        access,
        revokedAt: null,
        updatedAt: now,
        token: existing.revokedAt ? makeShareToken() : existing.token
      }
    : {
        id: crypto.randomUUID(),
        scanId,
        ownerUserId: actorUserId,
        token: makeShareToken(),
        access,
        accessCount: 0,
        lastAccessedAt: null,
        createdAt: now,
        updatedAt: now,
        revokedAt: null
      };

  if (existing) {
    shareByTokenStore.delete(existing.token);
  }

  shareByScanStore.set(scanId, share);
  shareByTokenStore.set(share.token, share);
  return share;
}

export async function revokeShareForScan(scanId: string, actorUserId: string) {
  if (hasDatabase()) {
    try {
      const share = await prisma.scanShare.findUnique({
        where: {
          scanId
        }
      });

      if (!share) {
        return null;
      }

      const revoked = await prisma.scanShare.update({
        where: {
          scanId
        },
        data: {
          ownerUserId: actorUserId,
          revokedAt: new Date()
        }
      });

      return {
        id: revoked.id,
        scanId: revoked.scanId,
        ownerUserId: revoked.ownerUserId,
        token: revoked.token,
        access: revoked.access,
        accessCount: revoked.accessCount,
        lastAccessedAt: revoked.lastAccessedAt?.toISOString() ?? null,
        createdAt: revoked.createdAt.toISOString(),
        updatedAt: revoked.updatedAt.toISOString(),
        revokedAt: revoked.revokedAt?.toISOString() ?? null
      } satisfies ShareLinkRecord;
    } catch (error) {
      console.error("Falling back to in-memory share revoke:", getErrorMessage(error));
    }
  }

  const existing = shareByScanStore.get(scanId);

  if (!existing) {
    return null;
  }

  const revoked: ShareLinkRecord = {
    ...existing,
    ownerUserId: actorUserId,
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  shareByScanStore.set(scanId, revoked);
  shareByTokenStore.set(revoked.token, revoked);
  return revoked;
}

export async function getSharedScanByToken(token: string, viewerUserId?: string | null) {
  if (hasDatabase()) {
    try {
      const share = await prisma.scanShare.findUnique({
        where: {
          token
        },
        include: {
          scan: {
            include: {
              findings: {
                orderBy: {
                  displayOrder: "asc"
                }
              },
              report: true,
              shareLink: true,
              organization: {
                include: {
                  memberships: true,
                  _count: {
                    select: {
                      memberships: true,
                      scans: true
                    }
                  }
                }
              },
              _count: {
                select: {
                  exports: true
                }
              }
            }
          }
        }
      });

      if (!share || share.revokedAt) {
        return null;
      }

      if (share.access === "PRIVATE" && !viewerUserId) {
        return { requiresAuth: true as const };
      }

      return {
        requiresAuth: false as const,
        share: {
          id: share.id,
          scanId: share.scanId,
          ownerUserId: share.ownerUserId,
          token: share.token,
          access: share.access,
          accessCount: share.accessCount,
          lastAccessedAt: share.lastAccessedAt?.toISOString() ?? null,
          createdAt: share.createdAt.toISOString(),
          updatedAt: share.updatedAt.toISOString(),
          revokedAt: null
        } satisfies ShareLinkRecord,
        scan: fromPrismaRecord(share.scan, viewerUserId)
      };
    } catch (error) {
      console.error("Falling back to in-memory share token lookup:", getErrorMessage(error));
    }
  }

  const share = activeMemoryShare(token);

  if (!share) {
    return null;
  }

  if (share.access === "PRIVATE" && !viewerUserId) {
    return { requiresAuth: true as const };
  }

  const ownedScan = memoryStore.get(share.scanId) ?? demoScans.find((scan) => scan.id === share.scanId);

  if (!ownedScan) {
    return null;
  }

  return {
    requiresAuth: false as const,
    share,
    scan: attachMemoryActivity(ownedScan, viewerUserId)
  };
}

export async function recordShareAccess(shareId: string) {
  if (hasDatabase()) {
    try {
      await prisma.scanShare.update({
        where: {
          id: shareId
        },
        data: {
          accessCount: {
            increment: 1
          },
          lastAccessedAt: new Date()
        }
      });
      return;
    } catch (error) {
      console.error("Falling back to in-memory share access tracking:", getErrorMessage(error));
    }
  }

  for (const [scanId, share] of shareByScanStore.entries()) {
    if (share.id === shareId) {
      const updated: ShareLinkRecord = {
        ...share,
        accessCount: share.accessCount + 1,
        lastAccessedAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      shareByScanStore.set(scanId, updated);
      shareByTokenStore.set(updated.token, updated);
      break;
    }
  }
}

export async function recordReportExport(scanId: string, ownerUserId: string, format: string) {
  if (hasDatabase()) {
    try {
      await prisma.reportExport.create({
        data: {
          scanId,
          ownerUserId,
          format
        }
      });
      return;
    } catch (error) {
      console.error("Falling back to in-memory export tracking:", getErrorMessage(error));
    }
  }

  exportStore.push({
    id: crypto.randomUUID(),
    scanId,
    ownerUserId,
    format,
    createdAt: new Date().toISOString()
  });
}