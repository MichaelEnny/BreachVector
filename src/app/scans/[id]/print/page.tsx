import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { PrintReportView } from "@/components/print-report-view";
import { PrintToolbar } from "@/components/print-toolbar";
import { Button } from "@/components/ui/button";
import { getViewerContext } from "@/lib/auth";
import { getScanById } from "@/lib/data/scans";

export const dynamic = "force-dynamic";

export default async function ScanPrintPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewerContext();
  const scan = await getScanById(
    id,
    viewer.userId,
    viewer.workspaces.map((workspace) => workspace.id)
  );

  if (!scan) {
    notFound();
  }

  return (
    <main className="min-h-screen bg-[#eef3f8] py-8 print:bg-white print:py-0">
      <div className="container mb-6 flex items-center justify-between gap-4 print:hidden">
        <Button asChild variant="secondary">
          <a href={`/scans/${scan.id}`}>
            <ArrowLeft className="h-4 w-4" />
            Back to report
          </a>
        </Button>
        <PrintToolbar />
      </div>
      <PrintReportView
        scan={scan}
        label={scan.workspace ? `${scan.workspace.name} print view` : "Owned print view"}
      />
    </main>
  );
}