import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { createWorkspaceInvite } from "@/lib/data/workspaces";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { WorkspaceRole } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to invite teammates." }, { status: 401 });
    }

    const { id } = await context.params;
    await enforceRateLimit({
      action: "INVITE_CREATED",
      actorUserId: viewer.userId,
      organizationId: id,
      limit: 10,
      windowMs: 10 * 60 * 1000,
      detail: "workspace invites"
    });

    const body = (await request.json()) as {
      emailAddress?: string;
      displayName?: string;
      role?: WorkspaceRole;
    };

    if (!body.emailAddress || !body.role) {
      return NextResponse.json({ error: "Email and role are required." }, { status: 400 });
    }

    const invite = await createWorkspaceInvite({
      organizationId: id,
      actorUserId: viewer.userId,
      emailAddress: body.emailAddress,
      displayName: body.displayName ?? null,
      role: body.role
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: id,
      action: "INVITE_CREATED",
      target: invite.emailAddress,
      detail: `Invite created for ${invite.emailAddress} as ${invite.role.toLowerCase()}.`
    });

    return NextResponse.json({ invite, url: new URL(`/join/${invite.token}`, request.url).toString() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}