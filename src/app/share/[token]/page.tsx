import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, ExternalLink, Link2, Lock, Sparkles } from "lucide-react";

import { FindingList } from "@/components/finding-list";
import { ScoreRing } from "@/components/score-ring";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getSignInUrl, getViewerContext } from "@/lib/auth";
import { recordAuditEvent } from "@/lib/data/audit";
import { getSharedScanByToken, recordShareAccess } from "@/lib/data/scans";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  return {
    title: `Shared Report ${token.slice(0, 6)} | BreachVector`
  };
}

export default async function SharedScanPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const viewer = await getViewerContext();
  const shared = await getSharedScanByToken(token, viewer.userId);

  if (!shared) {
    notFound();
  }

  if (shared.requiresAuth) {
    redirect(getSignInUrl(`/share/${token}`) as never);
  }

  await recordShareAccess(shared.share.id);
  await recordAuditEvent({
    actorUserId: viewer.userId,
    organizationId: shared.scan.organizationId,
    scanId: shared.scan.id,
    action: "SHARE_OPENED",
    target: shared.scan.normalizedUrl,
    detail: "Shared report opened."
  });

  const { scan, share } = shared;

  return (
    <main className="relative overflow-hidden pb-20">
      <div className="absolute inset-0 surface-grid opacity-20" />
      <div className="absolute left-1/2 top-[-15%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

      <section className="container relative z-10 py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="secondary">
            <Link href={"/" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Back to workspace
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant={share.access === "PUBLIC" ? "accent" : "warning"}>
              {share.access === "PUBLIC" ? "Public read-only link" : "Private read-only link"}
            </Badge>
            <Badge variant={scan.report.generatedByAi ? "success" : "warning"}>
              {scan.report.generatedByAi ? "AI narrative" : "Template narrative"}
            </Badge>
          </div>
        </div>
      </section>

      <section className="container relative z-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="overflow-hidden">
          <CardContent className="p-8 md:p-10">
            <div className="grid gap-8 lg:grid-cols-[auto_1fr] lg:items-start">
              <div className="flex justify-center">
                <ScoreRing score={scan.overallScore} />
              </div>
              <div>
                <div className="text-xs uppercase tracking-[0.32em] text-cyan-200/70">Shared report</div>
                <h1 className="mt-3 font-heading text-4xl text-white md:text-5xl">{scan.hostname}</h1>
                <p className="mt-2 text-sm text-white/45">{scan.normalizedUrl}</p>
                <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">{scan.executiveSummary}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-white/5">
          <CardHeader>
            <CardTitle>Share context</CardTitle>
            <CardDescription>This link is read-only and cannot modify report data.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/60">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Link2 className="h-4 w-4 text-cyan-100" />
                Shared access
              </div>
              {share.access === "PUBLIC"
                ? "Anyone with this token can open the report in read-only mode."
                : "This token requires an authenticated session before the report is revealed."}
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/40 p-4 text-sm text-white/60">
              <div className="mb-2 flex items-center gap-2 text-white">
                <Lock className="h-4 w-4 text-cyan-100" />
                Share opens
              </div>
              {share.accessCount + 1} tracked views
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <Button asChild variant="secondary">
                <a href={`/share/${token}/print`} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Print view
                </a>
              </Button>
              <Button asChild>
                <a href={`/api/scans/${scan.id}/pdf?shareToken=${token}`} target="_blank" rel="noreferrer">
                  <Sparkles className="h-4 w-4" />
                  Export PDF
                </a>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>

      <section className="container relative z-10 mt-8 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card className="bg-white/5">
          <CardHeader>
            <CardTitle>Top findings</CardTitle>
            <CardDescription>Prioritized observations from the passive website security review.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <FindingList findings={scan.findings} />
          </CardContent>
        </Card>

        <div className="grid gap-8">
          <Card className="bg-white/5">
            <CardHeader>
              <CardTitle>Technical narrative</CardTitle>
              <CardDescription>Shared for technical follow-up and stakeholder review.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-white/68">{scan.report.technicalNarrative}</p>
            </CardContent>
          </Card>

          <Card className="bg-white/5">
            <CardHeader>
              <CardTitle>Remediation plan</CardTitle>
              <CardDescription>Recommended next steps in priority order.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scan.report.remediationPlan.map((step, index) => (
                <div key={`${step.title}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/40 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-heading text-lg text-white">{step.title}</div>
                    <Badge variant={index === 0 ? "danger" : index === 1 ? "warning" : "default"}>
                      {step.priority}
                    </Badge>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/60">{step.detail}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </section>
    </main>
  );
}