import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { removeWorkspaceMember, updateWorkspaceMemberRole } from "@/lib/data/workspaces";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { WorkspaceRole } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; membershipId: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to manage members." }, { status: 401 });
    }

    const { id, membershipId } = await context.params;
    await enforceRateLimit({
      action: "MEMBER_ROLE_UPDATED",
      actorUserId: viewer.userId,
      organizationId: id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
      detail: "member role changes"
    });

    const body = (await request.json()) as { role?: WorkspaceRole };

    if (!body.role) {
      return NextResponse.json({ error: "A role is required." }, { status: 400 });
    }

    const member = await updateWorkspaceMemberRole({
      organizationId: id,
      membershipId,
      actorUserId: viewer.userId,
      role: body.role
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: id,
      action: "MEMBER_ROLE_UPDATED",
      target: member.emailAddress ?? member.userId,
      detail: `Member role updated to ${member.role.toLowerCase()}.`
    });

    return NextResponse.json({ member });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; membershipId: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to manage members." }, { status: 401 });
    }

    const { id, membershipId } = await context.params;
    await enforceRateLimit({
      action: "MEMBER_REMOVED",
      actorUserId: viewer.userId,
      organizationId: id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
      detail: "member removal"
    });

    const member = await removeWorkspaceMember({
      organizationId: id,
      membershipId,
      actorUserId: viewer.userId
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: id,
      action: "MEMBER_REMOVED",
      target: member.emailAddress ?? member.userId,
      detail: "Member removed from workspace."
    });

    return NextResponse.json({ member });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}