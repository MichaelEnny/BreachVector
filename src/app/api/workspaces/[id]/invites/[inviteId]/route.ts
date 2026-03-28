import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { refreshWorkspaceInvite, revokeWorkspaceInvite } from "@/lib/data/workspaces";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function PATCH(
  request: Request,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to refresh invites." }, { status: 401 });
    }

    const { id, inviteId } = await context.params;
    await enforceRateLimit({
      action: "INVITE_REFRESHED",
      actorUserId: viewer.userId,
      organizationId: id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
      detail: "invite refreshes"
    });

    const invite = await refreshWorkspaceInvite({
      organizationId: id,
      inviteId,
      actorUserId: viewer.userId
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: id,
      action: "INVITE_REFRESHED",
      target: invite.emailAddress,
      detail: `Invite refreshed for ${invite.emailAddress}.`
    });

    return NextResponse.json({ ok: true, invite, url: new URL(`/join/${invite.token}`, request.url).toString() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string; inviteId: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to revoke invites." }, { status: 401 });
    }

    const { id, inviteId } = await context.params;
    await enforceRateLimit({
      action: "INVITE_REVOKED",
      actorUserId: viewer.userId,
      organizationId: id,
      limit: 20,
      windowMs: 10 * 60 * 1000,
      detail: "invite changes"
    });

    const invite = await revokeWorkspaceInvite({
      organizationId: id,
      inviteId,
      actorUserId: viewer.userId
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: id,
      action: "INVITE_REVOKED",
      target: invite.emailAddress,
      detail: `Invite revoked for ${invite.emailAddress}.`
    });

    return NextResponse.json({ ok: true, invite });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
