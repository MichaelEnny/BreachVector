import { NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { getScanById, getSharedScanByToken, recordReportExport } from "@/lib/data/scans";
import { buildScanPdf } from "@/lib/pdf/report-pdf";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

function sanitizeFileName(value: string) {
  return value.replace(/[^a-z0-9.-]+/gi, "-").replace(/-+/g, "-").toLowerCase();
}

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const viewer = await getViewerContext();
    const requestUrl = new URL(request.url);
    const shareToken = requestUrl.searchParams.get("shareToken");

    let scan = await getScanById(
      id,
      viewer.userId,
      viewer.workspaces.map((workspace) => workspace.id)
    );

    if (!scan && shareToken) {
      const shared = await getSharedScanByToken(shareToken, viewer.userId);

      if (shared && !shared.requiresAuth && shared.scan.id === id) {
        scan = shared.scan;
      }
    }

    if (!scan) {
      return NextResponse.json({ error: "Report not found or not available for export." }, { status: 404 });
    }

    if (scan.origin === "LIVE" && !viewer.userId && !shareToken) {
      return NextResponse.json({ error: "Sign in to export a private report." }, { status: 401 });
    }

    if (viewer.userId && scan.organizationId) {
      await enforceRateLimit({
        action: "REPORT_EXPORTED",
        actorUserId: viewer.userId,
        organizationId: scan.organizationId,
        limit: 20,
        windowMs: 10 * 60 * 1000,
        detail: "report exports"
      });
    }

    const pdfBytes = await buildScanPdf(scan);
    await recordReportExport(scan.id, viewer.userId ?? scan.ownerUserId ?? "demo-showcase", "PDF");
    await recordAuditEvent({
      actorUserId: viewer.userId,
      organizationId: scan.organizationId,
      scanId: scan.id,
      action: "REPORT_EXPORTED",
      target: scan.normalizedUrl,
      detail: shareToken ? "PDF exported from a shared report token." : "PDF exported from the private dashboard."
    });

    return new NextResponse(Buffer.from(pdfBytes), {
      headers: {
        "content-type": "application/pdf",
        "content-disposition": `attachment; filename="${sanitizeFileName(scan.hostname)}-security-review.pdf"`
      }
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status = message.includes("Rate limit reached") ? 429 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}