import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { getWorkspaceForUser, WORKSPACE_COOKIE } from "@/lib/data/workspaces";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const viewer = await getViewerContext();

  if (!viewer.userId) {
    return NextResponse.json({ error: "Sign in to switch workspaces." }, { status: 401 });
  }

  const body = (await request.json()) as { workspaceId?: string };

  if (!body.workspaceId) {
    return NextResponse.json({ error: "A workspace is required." }, { status: 400 });
  }

  const workspace = await getWorkspaceForUser(viewer.userId, body.workspaceId);

  if (!workspace) {
    return NextResponse.json({ error: "Workspace not found." }, { status: 404 });
  }

  await recordAuditEvent({
    actorUserId: viewer.userId,
    organizationId: workspace.id,
    action: "WORKSPACE_SWITCHED",
    target: workspace.slug,
    detail: `Switched into ${workspace.name}.`
  });

  const response = NextResponse.json({ ok: true, workspace });
  response.cookies.set(WORKSPACE_COOKIE, workspace.id, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30
  });

  return response;
}