import { after, NextResponse } from "next/server";

import { getViewerContext } from "@/lib/auth";
import { getScanJobById, kickScanJobs } from "@/lib/data/jobs";

export const runtime = "nodejs";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  const viewer = await getViewerContext();

  if (!viewer.userId) {
    return NextResponse.json({ error: "Sign in to view scan jobs." }, { status: 401 });
  }

  const { id } = await context.params;
  const job = await getScanJobById(
    id,
    viewer.userId,
    viewer.workspaces.map((workspace) => workspace.id)
  );

  if (!job) {
    return NextResponse.json({ error: "Scan job not found." }, { status: 404 });
  }

  if (job.status === "QUEUED" || job.status === "PROCESSING") {
    after(() => {
      kickScanJobs(1, job.organizationId);
    });
  }

  return NextResponse.json({ job });
}
