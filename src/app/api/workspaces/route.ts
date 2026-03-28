import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { createWorkspaceForUser, WORKSPACE_COOKIE } from "@/lib/data/workspaces";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to create a workspace." }, { status: 401 });
    }

    const body = (await request.json()) as { name?: string; description?: string };
    const workspace = await createWorkspaceForUser({
      userId: viewer.userId,
      name: body.name ?? "",
      description: body.description ?? null,
      firstName: viewer.firstName,
      lastName: viewer.lastName,
      emailAddress: viewer.emailAddress
    });

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: workspace.id,
      action: "WORKSPACE_CREATED",
      target: workspace.slug,
      detail: `Workspace ${workspace.name} created.`
    });

    const response = NextResponse.json({ workspace });
    response.cookies.set(WORKSPACE_COOKIE, workspace.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      maxAge: 60 * 60 * 24 * 30
    });

    return response;
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 400 });
  }
}