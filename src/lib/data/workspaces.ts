import crypto from "node:crypto";

import { cookies } from "next/headers";

import { hasDatabase } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import type {
  MembershipRecord,
  OrganizationRecord,
  WorkspaceInviteRecord,
  WorkspaceRole,
  WorkspaceSummary,
  WorkspaceType
} from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

export const WORKSPACE_COOKIE = "bv_workspace";
const INVITE_EXPIRATION_DAYS = 7;

const globalForWorkspaces = globalThis as typeof globalThis & {
  breachVectorOrganizations?: Map<string, OrganizationRecord>;
  breachVectorMemberships?: Map<string, MembershipRecord>;
  breachVectorWorkspaceInvites?: Map<string, WorkspaceInviteRecord>;
};

const organizationStore = globalForWorkspaces.breachVectorOrganizations ?? new Map<string, OrganizationRecord>();
const membershipStore = globalForWorkspaces.breachVectorMemberships ?? new Map<string, MembershipRecord>();
const inviteStore = globalForWorkspaces.breachVectorWorkspaceInvites ?? new Map<string, WorkspaceInviteRecord>();

if (!globalForWorkspaces.breachVectorOrganizations) {
  globalForWorkspaces.breachVectorOrganizations = organizationStore;
}

if (!globalForWorkspaces.breachVectorMemberships) {
  globalForWorkspaces.breachVectorMemberships = membershipStore;
}

if (!globalForWorkspaces.breachVectorWorkspaceInvites) {
  globalForWorkspaces.breachVectorWorkspaceInvites = inviteStore;
}

function getMemoryScanCount(organizationId: string) {
  const globalForScans = globalThis as typeof globalThis & {
    breachVectorMemory?: Map<string, { organizationId?: string | null }>;
  };

  return [...(globalForScans.breachVectorMemory?.values() ?? [])].filter(
    (scan) => scan.organizationId === organizationId
  ).length;
}

function normalizeSlug(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .replace(/-{2,}/g, "-") || "workspace"
  );
}

function normalizeEmailAddress(value: string) {
  return value.trim().toLowerCase();
}

function makeWorkspaceSlug(name: string) {
  return `${normalizeSlug(name)}-${crypto.randomBytes(2).toString("hex")}`;
}

function makeInviteToken() {
  return crypto.randomBytes(24).toString("base64url");
}

function getNameSeed(firstName?: string | null, lastName?: string | null, emailAddress?: string | null) {
  const fullName = [firstName, lastName].filter(Boolean).join(" ").trim();

  if (fullName) {
    return fullName;
  }

  if (emailAddress) {
    return emailAddress.split("@")[0] ?? "Analyst";
  }

  return "Analyst";
}

function getPersonalWorkspaceName(firstName?: string | null, lastName?: string | null, emailAddress?: string | null) {
  return `${getNameSeed(firstName, lastName, emailAddress)} Personal`;
}

function getMembershipValues() {
  return [...membershipStore.values()];
}

function getInviteValues() {
  return [...inviteStore.values()];
}

function getDisplayName(firstName?: string | null, lastName?: string | null, emailAddress?: string | null) {
  return [firstName, lastName].filter(Boolean).join(" ").trim() || emailAddress || null;
}

function addInviteExpiration() {
  return new Date(Date.now() + INVITE_EXPIRATION_DAYS * 24 * 60 * 60 * 1000);
}

function fromOrganizationRecord(record: {
  id: string;
  slug: string;
  name: string;
  type: WorkspaceType;
  description: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    slug: record.slug,
    name: record.name,
    type: record.type,
    description: record.description,
    createdByUserId: record.createdByUserId,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  } satisfies OrganizationRecord;
}

function fromMembershipRecord(record: {
  id: string;
  organizationId: string;
  userId: string;
  displayName: string | null;
  emailAddress: string | null;
  role: WorkspaceRole;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    userId: record.userId,
    displayName: record.displayName,
    emailAddress: record.emailAddress,
    role: record.role,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  } satisfies MembershipRecord;
}

function fromInviteRecord(record: {
  id: string;
  organizationId: string;
  invitedByUserId: string;
  emailAddress: string;
  displayName: string | null;
  role: WorkspaceRole;
  token: string;
  status: "PENDING" | "ACCEPTED" | "REVOKED" | "EXPIRED";
  acceptedByUserId: string | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
}) {
  return {
    id: record.id,
    organizationId: record.organizationId,
    invitedByUserId: record.invitedByUserId,
    emailAddress: record.emailAddress,
    displayName: record.displayName,
    role: record.role,
    token: record.token,
    status: record.status,
    acceptedByUserId: record.acceptedByUserId,
    acceptedAt: record.acceptedAt?.toISOString() ?? null,
    revokedAt: record.revokedAt?.toISOString() ?? null,
    expiresAt: record.expiresAt.toISOString(),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  } satisfies WorkspaceInviteRecord;
}

function makeWorkspaceSummary(
  organization: OrganizationRecord,
  membership: MembershipRecord,
  counts: { memberCount: number; scanCount: number }
) {
  return {
    ...organization,
    membershipId: membership.id,
    role: membership.role,
    memberCount: counts.memberCount,
    scanCount: counts.scanCount
  } satisfies WorkspaceSummary;
}

async function ensurePersonalWorkspaceInDatabase(input: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}) {
  const existing = await prisma.membership.findFirst({
    where: {
      userId: input.userId,
      organization: {
        type: "PERSONAL"
      }
    }
  });

  if (existing) {
    return;
  }

  await prisma.organization.create({
    data: {
      slug: makeWorkspaceSlug(getPersonalWorkspaceName(input.firstName, input.lastName, input.emailAddress)),
      name: getPersonalWorkspaceName(input.firstName, input.lastName, input.emailAddress),
      type: "PERSONAL",
      description: "Private workspace for owned scans and exports.",
      createdByUserId: input.userId,
      memberships: {
        create: {
          userId: input.userId,
          displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
          emailAddress: input.emailAddress ?? null,
          role: "OWNER"
        }
      }
    }
  });
}

async function ensurePersonalWorkspaceInMemory(input: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}) {
  const existing = getMembershipValues().find((membership) => {
    if (membership.userId !== input.userId) {
      return false;
    }

    const organization = organizationStore.get(membership.organizationId);
    return organization?.type === "PERSONAL";
  });

  if (existing) {
    return;
  }

  const now = new Date().toISOString();
  const organization: OrganizationRecord = {
    id: crypto.randomUUID(),
    slug: makeWorkspaceSlug(getPersonalWorkspaceName(input.firstName, input.lastName, input.emailAddress)),
    name: getPersonalWorkspaceName(input.firstName, input.lastName, input.emailAddress),
    type: "PERSONAL",
    description: "Private workspace for owned scans and exports.",
    createdByUserId: input.userId,
    createdAt: now,
    updatedAt: now
  };
  const membership: MembershipRecord = {
    id: crypto.randomUUID(),
    organizationId: organization.id,
    userId: input.userId,
    displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
    emailAddress: input.emailAddress ?? null,
    role: "OWNER",
    createdAt: now,
    updatedAt: now
  };

  organizationStore.set(organization.id, organization);
  membershipStore.set(membership.id, membership);
}

async function getPreferredWorkspaceId() {
  const cookieStore = await cookies();
  return cookieStore.get(WORKSPACE_COOKIE)?.value ?? null;
}

async function getOrganizationById(organizationId: string) {
  if (hasDatabase()) {
    return prisma.organization.findUnique({
      where: {
        id: organizationId
      }
    });
  }

  const organization = organizationStore.get(organizationId);
  return organization
    ? {
        ...organization,
        createdAt: new Date(organization.createdAt),
        updatedAt: new Date(organization.updatedAt)
      }
    : null;
}

async function getMembershipById(membershipId: string) {
  if (hasDatabase()) {
    return prisma.membership.findUnique({
      where: {
        id: membershipId
      }
    });
  }

  const membership = membershipStore.get(membershipId);
  return membership
    ? {
        ...membership,
        createdAt: new Date(membership.createdAt),
        updatedAt: new Date(membership.updatedAt)
      }
    : null;
}

async function getMembershipForUser(userId: string, organizationId: string) {
  if (hasDatabase()) {
    return prisma.membership.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId
        }
      }
    });
  }

  const membership = getMembershipValues().find(
    (candidate) => candidate.userId === userId && candidate.organizationId === organizationId
  );

  return membership
    ? {
        ...membership,
        createdAt: new Date(membership.createdAt),
        updatedAt: new Date(membership.updatedAt)
      }
    : null;
}

async function countWorkspaceOwners(organizationId: string) {
  if (hasDatabase()) {
    return prisma.membership.count({
      where: {
        organizationId,
        role: "OWNER"
      }
    });
  }

  return getMembershipValues().filter(
    (membership) => membership.organizationId === organizationId && membership.role === "OWNER"
  ).length;
}

export async function resolveViewerWorkspaces(input: {
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}) {
  const preferredWorkspaceId = await getPreferredWorkspaceId();

  if (hasDatabase()) {
    try {
      await ensurePersonalWorkspaceInDatabase(input);

      const organizations = await prisma.organization.findMany({
        where: {
          memberships: {
            some: {
              userId: input.userId
            }
          }
        },
        include: {
          memberships: {
            where: {
              userId: input.userId
            }
          },
          _count: {
            select: {
              memberships: true,
              scans: true
            }
          }
        },
        orderBy: [{ type: "asc" }, { createdAt: "asc" }]
      });

      const workspaces = organizations
        .map((organization) => {
          const membership = organization.memberships[0];

          if (!membership) {
            return null;
          }

          return makeWorkspaceSummary(fromOrganizationRecord(organization), fromMembershipRecord(membership), {
            memberCount: organization._count.memberships,
            scanCount: organization._count.scans
          });
        })
        .filter((workspace): workspace is WorkspaceSummary => Boolean(workspace));

      const activeWorkspace =
        workspaces.find((workspace) => workspace.id === preferredWorkspaceId) ??
        workspaces.find((workspace) => workspace.type === "PERSONAL") ??
        workspaces[0] ??
        null;

      return {
        workspaces,
        activeWorkspace
      };
    } catch (error) {
      console.error("Falling back to in-memory workspace resolution:", getErrorMessage(error));
    }
  }

  await ensurePersonalWorkspaceInMemory(input);

  const workspaces = getMembershipValues()
    .filter((membership) => membership.userId === input.userId)
    .map((membership) => {
      const organization = organizationStore.get(membership.organizationId);

      if (!organization) {
        return null;
      }

      return makeWorkspaceSummary(organization, membership, {
        memberCount: getMembershipValues().filter(
          (candidate) => candidate.organizationId === membership.organizationId
        ).length,
        scanCount: getMemoryScanCount(membership.organizationId)
      });
    })
    .filter((workspace): workspace is WorkspaceSummary => Boolean(workspace))
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));

  const activeWorkspace =
    workspaces.find((workspace) => workspace.id === preferredWorkspaceId) ??
    workspaces.find((workspace) => workspace.type === "PERSONAL") ??
    workspaces[0] ??
    null;

  return {
    workspaces,
    activeWorkspace
  };
}

export async function getWorkspaceForUser(userId: string, organizationId: string) {
  if (hasDatabase()) {
    try {
      const organization = await prisma.organization.findFirst({
        where: {
          id: organizationId,
          memberships: {
            some: {
              userId
            }
          }
        },
        include: {
          memberships: {
            where: {
              userId
            }
          },
          _count: {
            select: {
              memberships: true,
              scans: true
            }
          }
        }
      });

      const membership = organization?.memberships[0];

      if (!organization || !membership) {
        return null;
      }

      return makeWorkspaceSummary(fromOrganizationRecord(organization), fromMembershipRecord(membership), {
        memberCount: organization._count.memberships,
        scanCount: organization._count.scans
      });
    } catch (error) {
      console.error("Falling back to in-memory workspace lookup:", getErrorMessage(error));
    }
  }

  const membership = getMembershipValues().find(
    (candidate) => candidate.userId === userId && candidate.organizationId === organizationId
  );
  const organization = organizationStore.get(organizationId);

  if (!membership || !organization) {
    return null;
  }

  return makeWorkspaceSummary(organization, membership, {
    memberCount: getMembershipValues().filter((candidate) => candidate.organizationId === organizationId).length,
    scanCount: getMemoryScanCount(organizationId)
  });
}

export async function createWorkspaceForUser(input: {
  userId: string;
  name: string;
  description?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}) {
  const trimmedName = input.name.trim();

  if (trimmedName.length < 3) {
    throw new Error("Workspace names must be at least 3 characters long.");
  }

  if (hasDatabase()) {
    try {
      const organization = await prisma.organization.create({
        data: {
          slug: makeWorkspaceSlug(trimmedName),
          name: trimmedName,
          type: "TEAM",
          description: input.description?.trim() || null,
          createdByUserId: input.userId,
          memberships: {
            create: {
              userId: input.userId,
              displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
              emailAddress: input.emailAddress ?? null,
              role: "OWNER"
            }
          }
        },
        include: {
          memberships: {
            where: {
              userId: input.userId
            }
          },
          _count: {
            select: {
              memberships: true,
              scans: true
            }
          }
        }
      });

      const membership = organization.memberships[0];

      if (!membership) {
        throw new Error("Workspace membership could not be created.");
      }

      return makeWorkspaceSummary(fromOrganizationRecord(organization), fromMembershipRecord(membership), {
        memberCount: organization._count.memberships,
        scanCount: organization._count.scans
      });
    } catch (error) {
      console.error("Falling back to in-memory workspace creation:", getErrorMessage(error));
    }
  }

  const now = new Date().toISOString();
  const organization: OrganizationRecord = {
    id: crypto.randomUUID(),
    slug: makeWorkspaceSlug(trimmedName),
    name: trimmedName,
    type: "TEAM",
    description: input.description?.trim() || null,
    createdByUserId: input.userId,
    createdAt: now,
    updatedAt: now
  };
  const membership: MembershipRecord = {
    id: crypto.randomUUID(),
    organizationId: organization.id,
    userId: input.userId,
    displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
    emailAddress: input.emailAddress ?? null,
    role: "OWNER",
    createdAt: now,
    updatedAt: now
  };

  organizationStore.set(organization.id, organization);
  membershipStore.set(membership.id, membership);

  return makeWorkspaceSummary(organization, membership, {
    memberCount: 1,
    scanCount: 0
  });
}

export async function getWorkspaceMembers(organizationId: string, viewerUserId: string) {
  const membership = await getMembershipForUser(viewerUserId, organizationId);

  if (!membership) {
    return [];
  }

  if (hasDatabase()) {
    try {
      const members = await prisma.membership.findMany({
        where: {
          organizationId
        },
        orderBy: [{ role: "asc" }, { createdAt: "asc" }]
      });

      return members.map(fromMembershipRecord);
    } catch (error) {
      console.error("Falling back to in-memory workspace members:", getErrorMessage(error));
    }
  }

  return getMembershipValues()
    .filter((candidate) => candidate.organizationId === organizationId)
    .sort((left, right) => left.createdAt.localeCompare(right.createdAt));
}

export async function getWorkspaceInvites(organizationId: string, viewerUserId: string) {
  const membership = await getMembershipForUser(viewerUserId, organizationId);

  if (!membership || !canInviteToWorkspace(membership.role)) {
    return [];
  }

  if (hasDatabase()) {
    try {
      const invites = await prisma.workspaceInvite.findMany({
        where: {
          organizationId,
          status: {
            in: ["PENDING", "ACCEPTED"]
          }
        },
        orderBy: {
          createdAt: "desc"
        }
      });

      return invites.map(fromInviteRecord);
    } catch (error) {
      console.error("Falling back to in-memory workspace invites:", getErrorMessage(error));
    }
  }

  return getInviteValues()
    .filter((invite) => invite.organizationId === organizationId && ["PENDING", "ACCEPTED"].includes(invite.status))
    .sort((left, right) => right.createdAt.localeCompare(left.createdAt));
}

export async function getWorkspaceInviteByToken(token: string) {
  if (hasDatabase()) {
    try {
      const invite = await prisma.workspaceInvite.findUnique({
        where: {
          token
        },
        include: {
          organization: true
        }
      });

      if (!invite) {
        return null;
      }

      const status = invite.expiresAt.getTime() < Date.now() && invite.status === "PENDING" ? "EXPIRED" : invite.status;
      const organization = fromOrganizationRecord(invite.organization);
      const record = fromInviteRecord({ ...invite, status });

      return {
        invite: record,
        organization
      };
    } catch (error) {
      console.error("Falling back to in-memory invite lookup:", getErrorMessage(error));
    }
  }

  const invite = getInviteValues().find((candidate) => candidate.token === token);

  if (!invite) {
    return null;
  }

  const organization = organizationStore.get(invite.organizationId);

  if (!organization) {
    return null;
  }

  const status = new Date(invite.expiresAt).getTime() < Date.now() && invite.status === "PENDING" ? "EXPIRED" : invite.status;

  return {
    invite: {
      ...invite,
      status
    } satisfies WorkspaceInviteRecord,
    organization
  };
}

export async function createWorkspaceInvite(input: {
  organizationId: string;
  actorUserId: string;
  emailAddress: string;
  displayName?: string | null;
  role: WorkspaceRole;
}) {
  const membership = await getMembershipForUser(input.actorUserId, input.organizationId);
  const organization = await getOrganizationById(input.organizationId);

  if (!membership || !organization || organization.type !== "TEAM" || !canInviteToWorkspace(membership.role)) {
    throw new Error("You do not have permission to invite teammates to this workspace.");
  }

  if (input.role === "OWNER" && membership.role !== "OWNER") {
    throw new Error("Only owners can invite another owner.");
  }

  const emailAddress = normalizeEmailAddress(input.emailAddress);

  if (!emailAddress.includes("@")) {
    throw new Error("Enter a valid teammate email address.");
  }

  if (hasDatabase()) {
    try {
      const existingMember = await prisma.membership.findFirst({
        where: {
          organizationId: input.organizationId,
          emailAddress
        }
      });

      if (existingMember) {
        throw new Error("That teammate is already a member of this workspace.");
      }

      const invite = await prisma.workspaceInvite.create({
        data: {
          organizationId: input.organizationId,
          invitedByUserId: input.actorUserId,
          emailAddress,
          displayName: input.displayName?.trim() || null,
          role: input.role,
          token: makeInviteToken(),
          status: "PENDING",
          expiresAt: addInviteExpiration()
        }
      });

      return fromInviteRecord(invite);
    } catch (error) {
      console.error("Falling back to in-memory invite creation:", getErrorMessage(error));
      if (error instanceof Error && error.message.includes("already a member")) {
        throw error;
      }
    }
  }

  const existingMember = getMembershipValues().find(
    (candidate) => candidate.organizationId === input.organizationId && candidate.emailAddress?.toLowerCase() === emailAddress
  );

  if (existingMember) {
    throw new Error("That teammate is already a member of this workspace.");
  }

  const now = new Date().toISOString();
  const invite: WorkspaceInviteRecord = {
    id: crypto.randomUUID(),
    organizationId: input.organizationId,
    invitedByUserId: input.actorUserId,
    emailAddress,
    displayName: input.displayName?.trim() || null,
    role: input.role,
    token: makeInviteToken(),
    status: "PENDING",
    acceptedByUserId: null,
    acceptedAt: null,
    revokedAt: null,
    expiresAt: addInviteExpiration().toISOString(),
    createdAt: now,
    updatedAt: now
  };
  inviteStore.set(invite.id, invite);
  return invite;
}

export async function revokeWorkspaceInvite(input: {
  organizationId: string;
  inviteId: string;
  actorUserId: string;
}) {
  const membership = await getMembershipForUser(input.actorUserId, input.organizationId);
  const organization = await getOrganizationById(input.organizationId);

  if (!membership || !organization || organization.type !== "TEAM" || !canInviteToWorkspace(membership.role)) {
    throw new Error("You do not have permission to revoke invites for this workspace.");
  }

  if (hasDatabase()) {
    try {
      const invite = await prisma.workspaceInvite.findUnique({
        where: {
          id: input.inviteId
        }
      });

      if (!invite || invite.organizationId !== input.organizationId) {
        throw new Error("Invite not found.");
      }

      const revoked = await prisma.workspaceInvite.update({
        where: {
          id: input.inviteId
        },
        data: {
          status: "REVOKED",
          revokedAt: new Date()
        }
      });

      return fromInviteRecord(revoked);
    } catch (error) {
      console.error("Falling back to in-memory invite revoke:", getErrorMessage(error));
    }
  }

  const invite = inviteStore.get(input.inviteId);

  if (!invite || invite.organizationId !== input.organizationId) {
    throw new Error("Invite not found.");
  }

  const revoked: WorkspaceInviteRecord = {
    ...invite,
    status: "REVOKED",
    revokedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  inviteStore.set(invite.id, revoked);
  return revoked;
}

export async function acceptWorkspaceInvite(input: {
  token: string;
  userId: string;
  firstName?: string | null;
  lastName?: string | null;
  emailAddress?: string | null;
}) {
  if (!input.emailAddress) {
    throw new Error("A verified email address is required to accept an invite.");
  }

  const inviteWithOrganization = await getWorkspaceInviteByToken(input.token);

  if (!inviteWithOrganization) {
    throw new Error("Invite not found.");
  }

  const { invite, organization } = inviteWithOrganization;

  if (invite.status !== "PENDING") {
    throw new Error("This invite is no longer active.");
  }

  if (new Date(invite.expiresAt).getTime() < Date.now()) {
    throw new Error("This invite has expired.");
  }

  if (normalizeEmailAddress(invite.emailAddress) !== normalizeEmailAddress(input.emailAddress)) {
    throw new Error("Sign in with the email address that received this invite.");
  }

  const existingMembership = await getMembershipForUser(input.userId, invite.organizationId);

  if (hasDatabase()) {
    try {
      const acceptedAt = new Date();

      if (!existingMembership) {
        await prisma.membership.create({
          data: {
            organizationId: invite.organizationId,
            userId: input.userId,
            displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
            emailAddress: input.emailAddress,
            role: invite.role
          }
        });
      }

      await prisma.workspaceInvite.update({
        where: {
          id: invite.id
        },
        data: {
          status: "ACCEPTED",
          acceptedByUserId: input.userId,
          acceptedAt
        }
      });
    } catch (error) {
      console.error("Falling back to in-memory invite acceptance:", getErrorMessage(error));
    }
  } else {
    if (!existingMembership) {
      const now = new Date().toISOString();
      const membership: MembershipRecord = {
        id: crypto.randomUUID(),
        organizationId: invite.organizationId,
        userId: input.userId,
        displayName: getDisplayName(input.firstName, input.lastName, input.emailAddress),
        emailAddress: input.emailAddress,
        role: invite.role,
        createdAt: now,
        updatedAt: now
      };
      membershipStore.set(membership.id, membership);
    }

    inviteStore.set(invite.id, {
      ...invite,
      status: "ACCEPTED",
      acceptedByUserId: input.userId,
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
  }

  const workspace = await getWorkspaceForUser(input.userId, invite.organizationId);

  if (!workspace) {
    throw new Error("The workspace could not be loaded after accepting the invite.");
  }

  return {
    workspace,
    invite: {
      ...invite,
      status: "ACCEPTED",
      acceptedByUserId: input.userId,
      acceptedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    } satisfies WorkspaceInviteRecord,
    organization
  };
}

export async function updateWorkspaceMemberRole(input: {
  organizationId: string;
  membershipId: string;
  actorUserId: string;
  role: WorkspaceRole;
}) {
  const actorMembership = await getMembershipForUser(input.actorUserId, input.organizationId);
  const organization = await getOrganizationById(input.organizationId);

  if (!actorMembership || !organization || organization.type !== "TEAM" || !canManageWorkspaceMembers(actorMembership.role)) {
    throw new Error("You do not have permission to manage workspace members.");
  }

  const targetMembership = await getMembershipById(input.membershipId);

  if (!targetMembership || targetMembership.organizationId !== input.organizationId) {
    throw new Error("Member not found.");
  }

  if (targetMembership.userId === input.actorUserId) {
    throw new Error("Change your own role from another owner account to avoid accidental lockout.");
  }

  if (targetMembership.role === "OWNER" && input.role !== "OWNER") {
    const ownerCount = await countWorkspaceOwners(input.organizationId);

    if (ownerCount <= 1) {
      throw new Error("A workspace must keep at least one owner.");
    }
  }

  if (hasDatabase()) {
    try {
      const updated = await prisma.membership.update({
        where: {
          id: input.membershipId
        },
        data: {
          role: input.role
        }
      });

      return fromMembershipRecord(updated);
    } catch (error) {
      console.error("Falling back to in-memory role update:", getErrorMessage(error));
    }
  }

  const existing = membershipStore.get(input.membershipId);

  if (!existing) {
    throw new Error("Member not found.");
  }

  const updated: MembershipRecord = {
    ...existing,
    role: input.role,
    updatedAt: new Date().toISOString()
  };
  membershipStore.set(updated.id, updated);
  return updated;
}

export async function removeWorkspaceMember(input: {
  organizationId: string;
  membershipId: string;
  actorUserId: string;
}) {
  const actorMembership = await getMembershipForUser(input.actorUserId, input.organizationId);
  const organization = await getOrganizationById(input.organizationId);

  if (!actorMembership || !organization || organization.type !== "TEAM" || !canManageWorkspaceMembers(actorMembership.role)) {
    throw new Error("You do not have permission to manage workspace members.");
  }

  const targetMembership = await getMembershipById(input.membershipId);

  if (!targetMembership || targetMembership.organizationId !== input.organizationId) {
    throw new Error("Member not found.");
  }

  if (targetMembership.userId === input.actorUserId) {
    throw new Error("Remove yourself from another owner account to avoid accidental lockout.");
  }

  if (targetMembership.role === "OWNER") {
    const ownerCount = await countWorkspaceOwners(input.organizationId);

    if (ownerCount <= 1) {
      throw new Error("A workspace must keep at least one owner.");
    }
  }

  if (hasDatabase()) {
    try {
      await prisma.membership.delete({
        where: {
          id: input.membershipId
        }
      });
      return fromMembershipRecord(targetMembership);
    } catch (error) {
      console.error("Falling back to in-memory member removal:", getErrorMessage(error));
    }
  }

  const existing = membershipStore.get(input.membershipId);

  if (!existing) {
    throw new Error("Member not found.");
  }

  membershipStore.delete(existing.id);
  return existing;
}

export async function refreshWorkspaceInvite(input: {
  organizationId: string;
  inviteId: string;
  actorUserId: string;
}) {
  const membership = await getMembershipForUser(input.actorUserId, input.organizationId);
  const organization = await getOrganizationById(input.organizationId);

  if (!membership || !organization || organization.type !== "TEAM" || !canInviteToWorkspace(membership.role)) {
    throw new Error("You do not have permission to refresh invites for this workspace.");
  }

  if (hasDatabase()) {
    try {
      const invite = await prisma.workspaceInvite.findUnique({
        where: {
          id: input.inviteId
        }
      });

      if (!invite || invite.organizationId !== input.organizationId) {
        throw new Error("Invite not found.");
      }

      if (invite.status !== "PENDING") {
        throw new Error("Only pending invites can be refreshed.");
      }

      const refreshed = await prisma.workspaceInvite.update({
        where: {
          id: input.inviteId
        },
        data: {
          token: makeInviteToken(),
          expiresAt: addInviteExpiration(),
          revokedAt: null,
          status: "PENDING"
        }
      });

      return fromInviteRecord(refreshed);
    } catch (error) {
      console.error("Falling back to in-memory invite refresh:", getErrorMessage(error));
      if (error instanceof Error && (error.message.includes("Invite not found") || error.message.includes("Only pending invites"))) {
        throw error;
      }
    }
  }

  const invite = inviteStore.get(input.inviteId);

  if (!invite || invite.organizationId !== input.organizationId) {
    throw new Error("Invite not found.");
  }

  if (invite.status !== "PENDING") {
    throw new Error("Only pending invites can be refreshed.");
  }

  const refreshed: WorkspaceInviteRecord = {
    ...invite,
    token: makeInviteToken(),
    expiresAt: addInviteExpiration().toISOString(),
    updatedAt: new Date().toISOString(),
    revokedAt: null,
    status: "PENDING"
  };
  inviteStore.set(refreshed.id, refreshed);
  return refreshed;
}
export function canCreateWorkspaceScan(role: WorkspaceRole) {
  return role !== "VIEWER";
}

export function canManageWorkspace(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageWorkspaceReports(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN" || role === "MEMBER";
}

export function canInviteToWorkspace(role: WorkspaceRole) {
  return role === "OWNER" || role === "ADMIN";
}

export function canManageWorkspaceMembers(role: WorkspaceRole) {
  return role === "OWNER";
}