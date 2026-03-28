import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { getScanById, revokeShareForScan, upsertShareForScan } from "@/lib/data/scans";
import { canManageWorkspaceReports } from "@/lib/data/workspaces";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import type { ShareAccess } from "@/lib/types";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to manage share links." }, { status: 401 });
    }

    const { id } = await context.params;
    const scan = await getScanById(
      id,
      viewer.userId,
      viewer.workspaces.map((workspace) => workspace.id)
    );

    const workspaceRole = scan?.organizationId
      ? viewer.workspaces.find((workspace) => workspace.id === scan.organizationId)?.role ?? null
      : null;

    if (!scan || scan.origin !== "LIVE" || !workspaceRole || !canManageWorkspaceReports(workspaceRole)) {
      return NextResponse.json(
        { error: "Only workspace members with report access can share this report." },
        { status: 404 }
      );
    }

    await enforceRateLimit({
      action: "SHARE_CREATED",
      actorUserId: viewer.userId,
      organizationId: scan.organizationId,
      limit: 12,
      windowMs: 10 * 60 * 1000,
      detail: "share link changes"
    });

    const body = (await request.json()) as { access?: ShareAccess };
    const access = body.access;

    if (access !== "PUBLIC" && access !== "PRIVATE") {
      return NextResponse.json({ error: "Share access must be PUBLIC or PRIVATE." }, { status: 400 });
    }

    const share = await upsertShareForScan(scan.id, viewer.userId, access);

    if (!share) {
      return NextResponse.json({ error: "The share link could not be created." }, { status: 500 });
    }

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: scan.organizationId,
      scanId: scan.id,
      action: "SHARE_CREATED",
      target: scan.normalizedUrl,
      detail: `Share link set to ${access.toLowerCase()}.`
    });

    return NextResponse.json({ share, url: new URL(`/share/${share.token}`, request.url).toString() });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to revoke share links." }, { status: 401 });
    }

    const { id } = await context.params;
    const scan = await getScanById(
      id,
      viewer.userId,
      viewer.workspaces.map((workspace) => workspace.id)
    );

    const workspaceRole = scan?.organizationId
      ? viewer.workspaces.find((workspace) => workspace.id === scan.organizationId)?.role ?? null
      : null;

    if (!scan || !workspaceRole || !canManageWorkspaceReports(workspaceRole)) {
      return NextResponse.json({ error: "No active share link was found for this report." }, { status: 404 });
    }

    await enforceRateLimit({
      action: "SHARE_REVOKED",
      actorUserId: viewer.userId,
      organizationId: scan.organizationId,
      limit: 12,
      windowMs: 10 * 60 * 1000,
      detail: "share link changes"
    });

    const revoked = await revokeShareForScan(id, viewer.userId);

    if (!revoked) {
      return NextResponse.json({ error: "No active share link was found for this report." }, { status: 404 });
    }

    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: scan.organizationId,
      scanId: scan.id,
      action: "SHARE_REVOKED",
      target: scan.normalizedUrl,
      detail: "Share link revoked."
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}