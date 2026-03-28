import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";

import { ScanJobStatus } from "@/components/scan-job-status";
import { Button } from "@/components/ui/button";
import { getViewerContext } from "@/lib/auth";
import { getScanJobById } from "@/lib/data/jobs";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Scan Job | BreachVector"
  };
}

export default async function ScanJobPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const viewer = await getViewerContext();
  const job = await getScanJobById(
    id,
    viewer.userId,
    viewer.workspaces.map((workspace) => workspace.id)
  );

  if (!job) {
    notFound();
  }

  return (
    <main className="relative overflow-hidden pb-20">
      <div className="absolute inset-0 surface-grid opacity-20" />
      <div className="absolute left-1/2 top-[-15%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

      <section className="container relative z-10 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="secondary">
            <Link href="/">
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
        </div>
      </section>

      <section className="container relative z-10">
        <ScanJobStatus initialJob={job} />
      </section>
    </main>
  );
}