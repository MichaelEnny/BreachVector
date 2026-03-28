import type { Metadata } from "next";
import Link from "next/link";
import type { Route } from "next";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Bot,
  Building2,
  Globe,
  Lock,
  MailCheck,
  Radar,
  ServerCog,
  ShieldEllipsis,
  Sparkles
} from "lucide-react";

import { FindingList } from "@/components/finding-list";
import { ReportActions } from "@/components/report-actions";
import { ScoreRing } from "@/components/score-ring";
import { StatusPill } from "@/components/status-pill";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerContext } from "@/lib/auth";
import { getScanById } from "@/lib/data/scans";
import { canManageWorkspaceReports } from "@/lib/data/workspaces";
import { formatDateTime, formatRelativeDays } from "@/lib/utils";

export const dynamic = "force-dynamic";

function badgeForScore(score: number) {
  if (score >= 80) {
    return "success" as const;
  }

  if (score >= 60) {
    return "warning" as const;
  }

  return "danger" as const;
}

export async function generateMetadata({
  params
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  return {
    title: "Scan Report | BreachVector"
  };
}

export default async function ScanPage({ params }: { params: Promise<{ id: string }> }) {
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

  const headerCoverage = Object.values(scan.signalSnapshot.headers).filter(Boolean).length;
  const workspaceRole = scan.organizationId
    ? viewer.workspaces.find((workspace) => workspace.id === scan.organizationId)?.role ?? null
    : null;
  const canManageShare = Boolean(
    scan.origin === "LIVE" && workspaceRole && canManageWorkspaceReports(workspaceRole)
  );
  const criticalCount = scan.findings.filter((finding) => ["CRITICAL", "HIGH"].includes(finding.severity)).length;
  const mediumCount = scan.findings.filter((finding) => finding.severity === "MEDIUM").length;
  const lowCount = scan.findings.filter((finding) => ["LOW", "INFO"].includes(finding.severity)).length;

  return (
    <main className="relative overflow-hidden pb-20">
      <div className="absolute inset-0 surface-grid opacity-20" />
      <div className="absolute left-1/2 top-[-16%] h-[34rem] w-[34rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />

      <section className="container relative z-10 py-8 md:py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Button asChild variant="secondary">
            <Link href={"/" as Route}>
              <ArrowLeft className="h-4 w-4" />
              Back to overview
            </Link>
          </Button>
          <div className="flex flex-wrap gap-2">
            <Badge variant={scan.origin === "DEMO" ? "accent" : "default"}>
              {scan.origin === "DEMO" ? "Seeded showcase" : "Live review"}
            </Badge>
            <Badge variant={badgeForScore(scan.overallScore)}>{scan.overallScore}/100 posture</Badge>
            <Badge variant={scan.report.generatedByAi ? "success" : "warning"}>
              {scan.report.generatedByAi ? "AI narrative" : "Template narrative"}
            </Badge>
            {scan.workspace ? <Badge>{scan.workspace.name}</Badge> : null}
            {scan.shareLink && !scan.shareLink.revokedAt ? (
              <Badge variant={scan.shareLink.access === "PUBLIC" ? "accent" : "warning"}>
                {scan.shareLink.access.toLowerCase()} share active
              </Badge>
            ) : null}
          </div>
        </div>
      </section>

      <section className="container relative z-10">
        <div className="panel-strong surface-radial scanline overflow-hidden p-7 md:p-10">
          <div className="grid gap-8 lg:grid-cols-[1.03fr_0.97fr]">
            <div>
              <div className="section-kicker">Security review</div>
              <h1 className="mt-4 text-balance font-heading text-4xl md:text-6xl">
                <span className="text-white">{scan.hostname}</span>
              </h1>
              <p className="mt-3 text-sm text-white/45">{scan.normalizedUrl}</p>
              <p className="mt-6 max-w-3xl text-lg leading-8 text-white/72">{scan.executiveSummary}</p>

              <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                <StatusPill
                  label="HTTPS"
                  value={scan.signalSnapshot.httpsReachable ? "Reachable" : "Not reachable"}
                  ok={scan.signalSnapshot.httpsReachable}
                />
                <StatusPill
                  label="Redirect"
                  value={scan.signalSnapshot.httpRedirectToHttps ? "HTTP -> HTTPS" : "No forced redirect"}
                  ok={scan.signalSnapshot.httpRedirectToHttps}
                />
                <StatusPill label="Headers" value={`${headerCoverage}/5 visible`} ok={headerCoverage >= 4} />
                <StatusPill
                  label="TLS"
                  value={formatRelativeDays(scan.signalSnapshot.tls.daysRemaining)}
                  ok={!scan.signalSnapshot.tls.expired}
                />
              </div>
            </div>

            <div className="grid gap-5 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="panel flex items-center justify-center p-5">
                <ScoreRing score={scan.overallScore} />
              </div>

              <div className="space-y-3">
                <div className="intel-card">
                  <div className="data-label">Issue mix</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
                    <div>
                      <div className="text-2xl font-heading text-rose-100">{criticalCount}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">Critical / high</div>
                    </div>
                    <div>
                      <div className="text-2xl font-heading text-amber-100">{mediumCount}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">Medium</div>
                    </div>
                    <div>
                      <div className="text-2xl font-heading text-cyan-100">{lowCount}</div>
                      <div className="mt-1 text-xs uppercase tracking-[0.22em] text-white/40">Low / info</div>
                    </div>
                  </div>
                </div>

                <div className="intel-card">
                  <div className="flex items-center gap-2 text-white">
                    <Sparkles className="h-4 w-4 text-cyan-100" />
                    <span className="font-medium">Report state</span>
                  </div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2">
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <div className="data-label">Completed</div>
                      <div className="mt-2 text-sm leading-6 text-white/65">
                        {scan.completedAt ? formatDateTime(scan.completedAt) : formatDateTime(scan.createdAt)}
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                      <div className="data-label">Audience</div>
                      <div className="mt-2 text-sm leading-6 text-white/65">Exec summary plus technical detail in one artifact</div>
                    </div>
                  </div>
                </div>

                <div className="intel-card">
                  <div className="flex items-center gap-2 text-white">
                    <AlertTriangle className="h-4 w-4 text-amber-100" />
                    <span className="font-medium">Recommended briefing order</span>
                  </div>
                  <div className="mt-3 space-y-2 text-sm text-white/62">
                    <div>1. Explain the overall score and why it matters.</div>
                    <div>2. Lead with the highest-severity finding and business impact.</div>
                    <div>3. Close with the remediation plan and share/export path.</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mt-8 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Report context</div>
            <CardTitle className="mt-2">Narrative and ownership layers</CardTitle>
            <CardDescription>Designed for executive walkthroughs and technical follow-up in the same screen.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="intel-card">
              <div className="flex items-center gap-3 text-white">
                <Globe className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">Scanned target</span>
              </div>
              <div className="mt-3 text-sm text-white/60">{scan.targetInput}</div>
            </div>
            <div className="intel-card">
              <div className="flex items-center gap-3 text-white">
                <Building2 className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">Workspace</span>
              </div>
              <div className="mt-3 text-sm text-white/60">
                {scan.workspace
                  ? `${scan.workspace.name} (${scan.workspace.role.toLowerCase()} access)`
                  : scan.origin === "DEMO"
                    ? "Public showcase scan"
                    : "Private live scan"}
              </div>
            </div>
            <div className="intel-card">
              <div className="flex items-center gap-3 text-white">
                <ShieldEllipsis className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">Access model</span>
              </div>
              <div className="mt-3 text-sm text-white/60">
                {scan.origin === "DEMO"
                  ? "Public seeded report"
                  : scan.workspace
                    ? "Shared with authorized members of the linked workspace"
                    : "Restricted to the scan owner"}
              </div>
            </div>
            <div className="intel-card">
              <div className="flex items-center gap-3 text-white">
                <Bot className="h-4 w-4 text-cyan-100" />
                <span className="font-medium">Narrative engine</span>
              </div>
              <div className="mt-3 text-sm text-white/60">
                {scan.report.generatedByAi
                  ? "OpenAI generated the narrative layers for this report."
                  : "Fallback templates generated the report because AI was unavailable or not configured."}
              </div>
            </div>
          </CardContent>
        </Card>

        <ReportActions
          scanId={scan.id}
          initialShareLink={scan.shareLink ?? null}
          exportCount={scan.exportCount}
          canManageShare={canManageShare}
        />
      </section>

      <section className="container relative z-10 mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Findings</div>
            <CardTitle className="mt-2">Top issues to brief first</CardTitle>
            <CardDescription>Prioritized observations from the passive website security review.</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <FindingList findings={scan.findings} />
          </CardContent>
        </Card>

        <div className="grid gap-8">
          <Card>
            <CardHeader>
              <div className="section-kicker">Technical narrative</div>
              <CardTitle className="mt-2">What an engineer should take away</CardTitle>
              <CardDescription>Readable enough for judges and still credible to technical reviewers.</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm leading-7 text-white/68">{scan.report.technicalNarrative}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="section-kicker">Remediation plan</div>
              <CardTitle className="mt-2">Fix order that makes sense</CardTitle>
              <CardDescription>What to fix first, next, and later.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {scan.report.remediationPlan.map((step, index) => (
                <div key={`${step.title}-${index}`} className="intel-card">
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

      <section className="container relative z-10 mt-8 grid gap-8 lg:grid-cols-[0.92fr_1.08fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Plain-English</div>
            <CardTitle className="mt-2">Explanations for non-security audiences</CardTitle>
            <CardDescription>Helpful for founders, PMs, recruiters, and judges.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {scan.report.plainEnglish.map((item) => (
              <div key={item.term} className="intel-card">
                <div className="font-heading text-lg text-white">{item.term}</div>
                <p className="mt-2 text-sm leading-6 text-white/60">{item.explanation}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="section-kicker">Signal breakdown</div>
            <CardTitle className="mt-2">Raw checkpoints from the passive review</CardTitle>
            <CardDescription>Transport, headers, cookies, and email-auth posture at a glance.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="intel-card">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <Lock className="h-4 w-4 text-cyan-100" />
                  Transport
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <div>HTTPS status: {scan.signalSnapshot.httpsStatus ?? "Unavailable"}</div>
                  <div>HTTP status: {scan.signalSnapshot.httpStatus ?? "Unavailable"}</div>
                  <div>TLS expiry: {scan.signalSnapshot.tls.validTo ? formatDateTime(scan.signalSnapshot.tls.validTo) : "Unknown"}</div>
                  <div>Days remaining: {formatRelativeDays(scan.signalSnapshot.tls.daysRemaining)}</div>
                </div>
              </div>
              <div className="intel-card">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <ShieldEllipsis className="h-4 w-4 text-cyan-100" />
                  Browser controls
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  {Object.entries(scan.signalSnapshot.headers).map(([name, value]) => (
                    <div key={name}>
                      <span className="text-white/78">{name}</span>: {value ? "Present" : "Missing"}
                    </div>
                  ))}
                </div>
              </div>
              <div className="intel-card">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <ServerCog className="h-4 w-4 text-cyan-100" />
                  Cookies
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <div>Visible cookies: {scan.signalSnapshot.cookieSnapshot.totalVisible}</div>
                  <div>Secure flags: {scan.signalSnapshot.cookieSnapshot.secureCount}</div>
                  <div>HttpOnly flags: {scan.signalSnapshot.cookieSnapshot.httpOnlyCount}</div>
                  <div>SameSite flags: {scan.signalSnapshot.cookieSnapshot.sameSiteCount}</div>
                </div>
              </div>
              <div className="intel-card">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <MailCheck className="h-4 w-4 text-cyan-100" />
                  Email auth and DNS
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <div>SPF: {scan.signalSnapshot.dnsAuth.spf === null ? "Not checked" : scan.signalSnapshot.dnsAuth.spf ? "Present" : "Missing"}</div>
                  <div>DMARC: {scan.signalSnapshot.dnsAuth.dmarc === null ? "Not checked" : scan.signalSnapshot.dnsAuth.dmarc ? "Present" : "Missing"}</div>
                  <div>MTA-STS: {scan.signalSnapshot.dnsAuth.mtaSts === null ? "Not checked" : scan.signalSnapshot.dnsAuth.mtaSts ? "Present" : "Missing"}</div>
                  <div>CAA: {scan.signalSnapshot.dnsAuth.caaPresent === null ? "Not checked" : scan.signalSnapshot.dnsAuth.caaPresent ? "Present" : "Missing"}</div>
                </div>
              </div>
              <div className="intel-card">
                <div className="mb-3 flex items-center gap-2 text-white">
                  <Radar className="h-4 w-4 text-cyan-100" />
                  Discovery files
                </div>
                <div className="space-y-2 text-sm text-white/60">
                  <div>robots.txt: {scan.signalSnapshot.discovery.robotsTxt.reachable ? "Reachable" : "Not detected"}</div>
                  <div>security.txt: {scan.signalSnapshot.discovery.securityTxt.reachable ? `Reachable via ${scan.signalSnapshot.discovery.securityTxt.source ?? "site root"}` : "Not detected"}</div>
                  <div>Security contacts: {scan.signalSnapshot.discovery.securityTxt.contactLines.length > 0 ? scan.signalSnapshot.discovery.securityTxt.contactLines.join(", ") : "Not published"}</div>
                </div>
              </div>
            </div>

            {scan.signalSnapshot.responseNotes.length > 0 ? (
              <div className="intel-card border-cyan-300/10 bg-cyan-300/6">
                <div className="flex items-center gap-2 text-white">
                  <Radar className="h-4 w-4 text-cyan-100" />
                  Response notes
                </div>
                <div className="mt-3 space-y-2 text-sm text-white/58">
                  {scan.signalSnapshot.responseNotes.map((note) => (
                    <div key={note}>{note}</div>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </section>
    </main>
  );
}
