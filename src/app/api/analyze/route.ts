import { after, NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { createScanJob, kickScanJobs } from "@/lib/data/jobs";
import { canCreateWorkspaceScan } from "@/lib/data/workspaces";
import { hasClerkAuth } from "@/lib/env";
import { DAILY_SCAN_LIMIT } from "@/lib/limits";
import { getUserDailyScanCount } from "@/lib/data/scans";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    if (!hasClerkAuth()) {
      return NextResponse.json(
        { error: "Authentication is not configured. Add Clerk keys to enable workspace scans." },
        { status: 503 }
      );
    }

    const viewer = await getViewerContext();

    if (!viewer.userId) {
      return NextResponse.json({ error: "Sign in to run a scan." }, { status: 401 });
    }

    if (!viewer.activeWorkspace) {
      return NextResponse.json(
        { error: "No active workspace is available. Create or select a workspace first." },
        { status: 400 }
      );
    }

    if (!canCreateWorkspaceScan(viewer.activeWorkspace.role)) {
      return NextResponse.json(
        { error: "Your role in the current workspace does not allow running scans." },
        { status: 403 }
      );
    }

    await enforceRateLimit({
      action: "SCAN_REQUESTED",
      actorUserId: viewer.userId,
      organizationId: viewer.activeWorkspace.id,
      limit: 6,
      windowMs: 10 * 60 * 1000,
      detail: "scan requests"
    });

    const dailyCount = await getUserDailyScanCount(viewer.userId);

    if (dailyCount >= DAILY_SCAN_LIMIT) {
      return NextResponse.json(
        {
          error: `You have reached the free-tier limit of ${DAILY_SCAN_LIMIT} scans in the last 24 hours.`
        },
        { status: 429 }
      );
    }

    const body = (await request.json()) as { target?: string };

    if (!body.target) {
      return NextResponse.json({ error: "A target domain or URL is required." }, { status: 400 });
    }

    const job = await createScanJob({
      ownerUserId: viewer.userId,
      organizationId: viewer.activeWorkspace.id,
      target: body.target
    });

    if (job.status === "QUEUED" || job.status === "PROCESSING") {
      after(() => {
        kickScanJobs(2, viewer.activeWorkspace?.id ?? null);
      });
    }

    return NextResponse.json({
      jobId: job.id,
      status: job.status,
      resultScanId: job.resultScanId
    });
  } catch (error) {
    const message = getErrorMessage(error);
    const status =
      message.includes("Enter a domain") ||
      message.includes("Only http://") ||
      message.includes("valid hostname")
        ? 400
        : message.includes("Rate limit reached")
          ? 429
          : 500;

    return NextResponse.json({ error: message }, { status });
  }
}
