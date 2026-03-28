import { Badge } from "@/components/ui/badge";
import type { StoredScan } from "@/lib/types";
import { formatDateTime, formatRelativeDays } from "@/lib/utils";

function badgeForScore(score: number) {
  if (score >= 80) {
    return "success" as const;
  }

  if (score >= 60) {
    return "warning" as const;
  }

  return "danger" as const;
}

export function PrintReportView({
  scan,
  label
}: {
  scan: StoredScan;
  label: string;
}) {
  return (
    <div className="mx-auto max-w-5xl bg-white px-8 py-10 text-slate-900 print:max-w-none print:px-0">
      <div className="mb-8 flex items-start justify-between gap-6 border-b border-slate-200 pb-8">
        <div>
          <div className="text-xs uppercase tracking-[0.3em] text-slate-500">BreachVector</div>
          <h1 className="mt-3 font-heading text-4xl text-slate-950">Website security review</h1>
          <p className="mt-4 text-sm text-slate-600">{scan.hostname}</p>
          <p className="mt-2 text-sm text-slate-500">{scan.normalizedUrl}</p>
        </div>
        <div className="text-right">
          <div className="font-heading text-5xl text-slate-950">{scan.overallScore}</div>
          <div className="mt-2 text-xs uppercase tracking-[0.24em] text-slate-500">Overall score</div>
        </div>
      </div>

      <div className="mb-8 flex flex-wrap gap-2">
        <Badge variant={badgeForScore(scan.overallScore)}>{scan.overallScore}/100 posture</Badge>
        <Badge variant={scan.report.generatedByAi ? "success" : "warning"}>
          {scan.report.generatedByAi ? "AI narrative" : "Template narrative"}
        </Badge>
        <Badge variant="default">{label}</Badge>
      </div>

      <section className="mb-8">
        <h2 className="font-heading text-2xl text-slate-950">Executive summary</h2>
        <p className="mt-4 text-base leading-8 text-slate-700">{scan.executiveSummary}</p>
      </section>

      <section className="mb-8 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">HTTPS</div>
          <div className="mt-2 text-sm text-slate-800">{scan.signalSnapshot.httpsReachable ? "Reachable" : "Not reachable"}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Redirect</div>
          <div className="mt-2 text-sm text-slate-800">{scan.signalSnapshot.httpRedirectToHttps ? "HTTP to HTTPS" : "No forced redirect"}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">TLS</div>
          <div className="mt-2 text-sm text-slate-800">{formatRelativeDays(scan.signalSnapshot.tls.daysRemaining)}</div>
        </div>
        <div className="rounded-3xl border border-slate-200 p-4">
          <div className="text-xs uppercase tracking-[0.22em] text-slate-500">Completed</div>
          <div className="mt-2 text-sm text-slate-800">{formatDateTime(scan.completedAt ?? scan.createdAt)}</div>
        </div>
      </section>

      <section className="mb-8">
        <h2 className="font-heading text-2xl text-slate-950">Top findings</h2>
        <div className="mt-4 space-y-4">
          {scan.findings.map((finding) => (
            <div key={`${finding.title}-${finding.displayOrder}`} className="rounded-3xl border border-slate-200 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-xs uppercase tracking-[0.22em] text-slate-500">{finding.category}</div>
                  <div className="mt-2 font-heading text-xl text-slate-950">{finding.title}</div>
                </div>
                <Badge variant={finding.severity === "HIGH" || finding.severity === "CRITICAL" ? "danger" : finding.severity === "MEDIUM" ? "warning" : "default"}>
                  {finding.severity}
                </Badge>
              </div>
              <p className="mt-3 text-sm leading-7 text-slate-700">{finding.summary}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">
                <span className="font-medium text-slate-900">Remediation:</span> {finding.recommendation}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="mb-8 grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl text-slate-950">Technical narrative</h2>
          <p className="mt-4 text-sm leading-7 text-slate-700">{scan.report.technicalNarrative}</p>
        </div>
        <div>
          <h2 className="font-heading text-2xl text-slate-950">Remediation plan</h2>
          <div className="mt-4 space-y-3">
            {scan.report.remediationPlan.map((step, index) => (
              <div key={`${step.title}-${index}`} className="rounded-3xl border border-slate-200 p-4">
                <div className="font-heading text-lg text-slate-950">{step.title}</div>
                <div className="mt-1 text-xs uppercase tracking-[0.2em] text-slate-500">{step.priority}</div>
                <p className="mt-3 text-sm leading-7 text-slate-700">{step.detail}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-8 md:grid-cols-2">
        <div>
          <h2 className="font-heading text-2xl text-slate-950">Plain-English explanations</h2>
          <div className="mt-4 space-y-3">
            {scan.report.plainEnglish.map((item) => (
              <div key={item.term} className="rounded-3xl border border-slate-200 p-4">
                <div className="font-heading text-lg text-slate-950">{item.term}</div>
                <p className="mt-2 text-sm leading-7 text-slate-700">{item.explanation}</p>
              </div>
            ))}
          </div>
        </div>
        <div>
          <h2 className="font-heading text-2xl text-slate-950">Signal breakdown</h2>
          <div className="mt-4 rounded-3xl border border-slate-200 p-5 text-sm leading-7 text-slate-700">
            <div>HTTPS status: {scan.signalSnapshot.httpsStatus ?? "Unavailable"}</div>
            <div>HTTP status: {scan.signalSnapshot.httpStatus ?? "Unavailable"}</div>
            <div>TLS expiry: {scan.signalSnapshot.tls.validTo ? formatDateTime(scan.signalSnapshot.tls.validTo) : "Unknown"}</div>
            <div>Visible cookies: {scan.signalSnapshot.cookieSnapshot.totalVisible}</div>
            <div>SPF: {scan.signalSnapshot.dnsAuth.spf === null ? "Not checked" : scan.signalSnapshot.dnsAuth.spf ? "Present" : "Missing"}</div>
            <div>DMARC: {scan.signalSnapshot.dnsAuth.dmarc === null ? "Not checked" : scan.signalSnapshot.dnsAuth.dmarc ? "Present" : "Missing"}</div>
            <div>MTA-STS: {scan.signalSnapshot.dnsAuth.mtaSts === null ? "Not checked" : scan.signalSnapshot.dnsAuth.mtaSts ? "Present" : "Missing"}</div>
            <div>CAA: {scan.signalSnapshot.dnsAuth.caaPresent === null ? "Not checked" : scan.signalSnapshot.dnsAuth.caaPresent ? "Present" : "Missing"}</div>
            <div>robots.txt: {scan.signalSnapshot.discovery.robotsTxt.reachable ? "Reachable" : "Not detected"}</div>
            <div>security.txt: {scan.signalSnapshot.discovery.securityTxt.reachable ? "Reachable" : "Not detected"}</div>
          </div>
        </div>
      </section>
    </div>
  );
}
