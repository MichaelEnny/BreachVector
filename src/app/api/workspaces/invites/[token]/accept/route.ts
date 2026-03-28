import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { acceptWorkspaceInvite, WORKSPACE_COOKIE } from "@/lib/data/workspaces";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to accept an invite." }, { status: 401 });
    }

    const { token } = await context.params;
    await enforceRateLimit({
      action: "INVITE_ACCEPTED",
      actorUserId: viewer.userId,
      limit: 10,
      windowMs: 10 * 60 * 1000,
      detail: "invite acceptance"
    });

    const accepted = await acceptWorkspaceInvite({
      token,
      userId: viewer.userId,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      emailAddress: viewer.emailAddress
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: accepted.workspace.id,
      action: "INVITE_ACCEPTED",
      target: accepted.invite.emailAddress,
      detail: `Invite accepted into ${accepted.workspace.name}.`
    });

    const response = NextResponse.json({ workspace: accepted.workspace });
    response.cookies.set(WORKSPACE_COOKIE, accepted.workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}