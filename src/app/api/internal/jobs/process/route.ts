import { NextResponse } from "next/server";

import { dispatchScanJobs } from "@/lib/data/jobs";
import { getWorkerSecret } from "@/lib/env";
import { getErrorMessage } from "@/lib/utils";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const configuredSecret = getWorkerSecret();

  if (!configuredSecret) {
    return process.env.NODE_ENV !== "production";
  }

  const authHeader = request.headers.get("authorization");
  return authHeader === `Bearer ${configuredSecret}`;
}

async function resolveDispatchInput(request: Request) {
  const url = new URL(request.url);
  const batchParam = Number(url.searchParams.get("batch") ?? "2");
  const queryBatchSize = Number.isFinite(batchParam) ? batchParam : 2;
  const organizationId = url.searchParams.get("organizationId");

  if (request.method !== "POST") {
    return {
      batchSize: queryBatchSize,
      organizationId: organizationId || null
    };
  }

  const body = request.headers.get("content-type")?.includes("application/json")
    ? ((await request.json()) as { organizationId?: string | null; batchSize?: number } | null)
    : null;

  return {
    batchSize: body?.batchSize ?? queryBatchSize,
    organizationId: body?.organizationId ?? organizationId ?? null
  };
}

async function processWorkerDispatch(request: Request) {
  try {
    if (!isAuthorized(request)) {
      return NextResponse.json({ error: "Unauthorized worker request." }, { status: 401 });
    }

    const input = await resolveDispatchInput(request);
    const result = await dispatchScanJobs({
      batchSize: input.batchSize,
      organizationId: input.organizationId
    });

    return NextResponse.json({ ok: true, ...result });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function GET(request: Request) {
  return processWorkerDispatch(request);
}

export async function POST(request: Request) {
  return processWorkerDispatch(request);
}