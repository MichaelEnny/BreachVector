import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintReportView } from "@/components/print-report-view";
import { PrintToolbar } from "@/components/print-toolbar";
import { Button } from "@/components/ui/button";
import { getSignInUrl, getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { getSharedScanByToken, recordShareAccess } from "@/lib/data/scans";

export const dynamic = "force-dynamic";

export default async function SharedScanPrintPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewerContext();
  const shared = await getSharedScanByToken(token, viewer.userId);

  if (!shared) {
    notFound();
  }

  if (shared.requiresAuth) {
    redirect(getSignInUrl(`/share/${token}/print`) as never);
  }

  await recordShareAccess(shared.share.id);
  await recordAuditEvent({
    actorUserId: viewer.userId,
    organizationId: shared.scan.organizationId,
    scanId: shared.scan.id,
    action: "SHARE_OPENED",
    target: shared.scan.normalizedUrl,
    detail: "Shared print view opened."
  });

  return (
    <main className="min-h-screen bg-[#eef3f8] py-8 print:bg-white print:py-0">
      <div className="container mb-6 flex items-center justify-between gap-4 print:hidden">
        <Button asChild variant="secondary">
          <a href={`/share/${token}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to shared report
          </a>
        </Button>
        <PrintToolbar />
      </div>
      <PrintReportView
        scan={shared.scan}
        label={shared.share.access === "PUBLIC" ? "Public shared print view" : "Private shared print view"}
      />
    </main>
  );
}