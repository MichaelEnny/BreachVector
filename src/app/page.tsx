import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  CheckCircle2,
  Database,
  Fingerprint,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
  WandSparkles
} from "lucide-react";

import { AnalyzeForm } from "@/components/analyze-form";
import { HistoryList } from "@/components/history-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerContext } from "@/lib/auth";
import { getShowcaseScans, getWorkspaceScans } from "@/lib/data/scans";
import { canCreateWorkspaceScan } from "@/lib/data/workspaces";
import { getAppCapabilities } from "@/lib/env";

export const dynamic = "force-dynamic";

const featureCards = [
  {
    icon: Shield,
    title: "Safe by design",
    copy: "Only passive, public-facing checks. No exploitation, fuzzing, or aggressive scanning."
  },
  {
    icon: WandSparkles,
    title: "Executive-ready output",
    copy: "Narratives, severity-ranked findings, and prioritized remediation without sounding toy-grade."
  },
  {
    icon: Database,
    title: "Team-ready flow",
    copy: "Owned scans, workspace history, invitations, sharing, and exports built into the demo."
  }
];

const workflowSteps = [
  "Queue a passive scan against a public domain or URL.",
  "Capture transport, header, cookie, and email-auth signals.",
  "Generate a polished report for executives and engineers."
];

const productSignals = [
  "HTTPS + redirect posture",
  "TLS lifecycle visibility",
  "Security headers and cookie controls",
  "PDF export and read-only sharing"
];

export default async function HomePage() {
  const viewer = await getViewerContext();
  const showcaseScans = await getShowcaseScans(4);
  const workspaceScans =
    viewer.userId && viewer.activeWorkspace
      ? await getWorkspaceScans(viewer.activeWorkspace.id, viewer.userId, 4)
      : [];
  const capabilities = getAppCapabilities();
  const canScan = viewer.activeWorkspace ? canCreateWorkspaceScan(viewer.activeWorkspace.role) : false;
  const leadDemo = showcaseScans[0] ?? null;

  return (
    <main className="relative overflow-hidden pb-24">
      <div className="absolute inset-0 surface-grid opacity-25" />
      <div className="absolute left-[-8%] top-20 h-72 w-72 animate-drift rounded-full bg-cyan-300/10 blur-3xl" />
      <div className="absolute right-[-4%] top-40 h-96 w-96 animate-float rounded-full bg-emerald-300/10 blur-3xl" />

      <section className="container relative z-10 pt-8 md:pt-12">
        <div className="panel-strong surface-radial scanline overflow-hidden p-7 md:p-10">
          <div className="grid gap-10 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="accent">Showcase-safe passive review</Badge>
                <Badge variant={capabilities.database ? "success" : "warning"}>
                  {capabilities.database ? "Persistence connected" : "Demo history mode"}
                </Badge>
                <Badge variant={capabilities.openai ? "accent" : "warning"}>
                  {capabilities.openai ? "AI narratives enabled" : "Template narrative fallback"}
                </Badge>
              </div>

              <div className="mt-8 section-kicker">BreachVector</div>
              <h1 className="mt-4 max-w-5xl text-balance font-heading text-5xl leading-none md:text-7xl">
                <span className="text-white">Security posture reviews that feel</span>{" "}
                <span className="text-gradient">venture-ready on first impression.</span>
              </h1>
              <p className="mt-6 max-w-3xl text-balance text-lg leading-8 text-white/68">
                BreachVector turns lightweight website security checks into a startup-grade product experience with scores,
                narratives, remediation guidance, exports, team workspaces, and recruiter-friendly visual polish.
              </p>

              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                <div className="intel-card">
                  <div className="data-label">Checks</div>
                  <div className="metric-value mt-2">8+</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">HTTPS, TLS, headers, cookie flags, SPF, and DMARC when visible.</p>
                </div>
                <div className="intel-card">
                  <div className="data-label">Outputs</div>
                  <div className="metric-value mt-2">4</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">Dashboard, print view, PDF export, and tokenized shared reports.</p>
                </div>
                <div className="intel-card">
                  <div className="data-label">Mode</div>
                  <div className="metric-value mt-2">Multi-user</div>
                  <p className="mt-2 text-sm leading-6 text-white/58">Personal and team workspaces with ownership, invites, and guarded access.</p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={leadDemo ? `/scans/${leadDemo.id}` : "/"}>
                    Open demo report
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={"/history" as Route}>Explore workspace history</Link>
                </Button>
              </div>
            </div>

            <div className="space-y-5">
              <AnalyzeForm
                authEnabled={viewer.authEnabled}
                signedIn={Boolean(viewer.userId)}
                activeWorkspace={viewer.activeWorkspace}
                canScan={canScan}
              />

              <div className="panel p-5">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="section-kicker">Signal board</div>
                    <div className="mt-2 font-heading text-2xl text-white">Startup-demo control room</div>
                  </div>
                  <Fingerprint className="h-5 w-5 text-cyan-200" />
                </div>

                <div className="mt-4 grid gap-3 sm:grid-cols-[1.1fr_0.9fr]">
                  <div className="intel-card">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="data-label">Lead sample</div>
                        <div className="mt-2 font-heading text-xl text-white">{leadDemo?.hostname ?? "Showcase report"}</div>
                      </div>
                      <Badge variant="accent">Live feel</Badge>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-white/58">
                      {leadDemo?.executiveSummary ?? "Seeded demo reports keep the product feeling active even before the first scan."}
                    </p>
                    <div className="mt-4 flex items-center gap-2 text-sm text-cyan-100">
                      <CheckCircle2 className="h-4 w-4" />
                      Executive summary, findings, print, share, export
                    </div>
                  </div>

                  <div className="space-y-3">
                    {productSignals.map((signal, index) => (
                      <div key={signal} className="intel-card flex items-center gap-3">
                        <span
                          className={`status-lamp ${
                            index === 0
                              ? "bg-emerald-300 shadow-[0_0_18px_rgba(110,231,183,0.55)]"
                              : index === 1
                                ? "bg-cyan-300 shadow-[0_0_18px_rgba(125,211,252,0.55)]"
                                : index === 2
                                  ? "bg-amber-300 shadow-[0_0_18px_rgba(252,211,77,0.45)]"
                                  : "bg-sky-300 shadow-[0_0_18px_rgba(125,211,252,0.45)]"
                          }`}
                        />
                        <div className="text-sm leading-6 text-white/68">{signal}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mt-6">
        <div className="panel overflow-hidden px-5 py-4">
          <div className="flex flex-wrap items-center gap-x-8 gap-y-3 text-sm text-white/60">
            <span className="section-kicker text-[10px]">Built for the demo table</span>
            <span className="inline-flex items-center gap-2"><Radar className="h-4 w-4 text-cyan-100" /> Recruiter-friendly visual story</span>
            <span className="inline-flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-cyan-100" /> Passive and legal by design</span>
            <span className="inline-flex items-center gap-2"><Database className="h-4 w-4 text-cyan-100" /> Ownership, sharing, and team workspaces</span>
          </div>
        </div>
      </section>

      <section className="container relative z-10 mt-10 md:mt-12">
        <div className="grid gap-5 lg:grid-cols-[0.95fr_1.05fr]">
          <Card>
            <CardHeader>
              <div className="section-kicker">Why it demos well</div>
              <CardTitle className="mt-2 text-3xl">Product substance, not just a scan button</CardTitle>
              <CardDescription>
                The product now covers the full story: safe analysis, AI reporting, ownership, collaboration, exports, and auditability.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {workflowSteps.map((step, index) => (
                <div key={step} className="flex items-start gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-cyan-300/20 bg-cyan-300/10 font-heading text-sm text-cyan-50">
                    0{index + 1}
                  </div>
                  <div className="pt-1 text-sm leading-6 text-white/68">{step}</div>
                </div>
              ))}
            </CardContent>
          </Card>

          <div className="grid gap-5 md:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {featureCards.map((feature) => {
              const Icon = feature.icon;

              return (
                <Card key={feature.title} className="h-full">
                  <CardHeader>
                    <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
                      <Icon className="h-5 w-5 text-cyan-100" />
                    </div>
                    <CardTitle className="mt-3">{feature.title}</CardTitle>
                    <CardDescription>{feature.copy}</CardDescription>
                  </CardHeader>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {viewer.userId && viewer.activeWorkspace ? (
        <section className="container relative z-10 mt-12">
          <div className="grid gap-6 lg:grid-cols-[0.86fr_1.14fr] lg:items-start">
            <div className="panel p-6 md:p-7">
              <div className="section-kicker">Current workspace</div>
              <h2 className="mt-3 font-heading text-3xl text-white">{viewer.activeWorkspace.name}</h2>
              <p className="mt-4 text-sm leading-7 text-white/62">
                {viewer.activeWorkspace.type === "PERSONAL"
                  ? "Personal workspaces keep authored live scans private to your account by default."
                  : "Team workspaces let authorized collaborators view, export, and share reports from the same operating surface."}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="intel-card">
                  <div className="data-label">Role</div>
                  <div className="mt-2 text-lg text-white">{viewer.activeWorkspace.role.toLowerCase()}</div>
                </div>
                <div className="intel-card">
                  <div className="data-label">Workspace type</div>
                  <div className="mt-2 text-lg text-white">{viewer.activeWorkspace.type.toLowerCase()}</div>
                </div>
              </div>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link href={"/history" as Route}>Open workspace history</Link>
                </Button>
                <Button asChild variant="secondary">
                  <Link href={"/account" as Route}>Manage team and access</Link>
                </Button>
              </div>
            </div>
            <HistoryList scans={workspaceScans} />
          </div>
        </section>
      ) : null}

      <section className="container relative z-10 mt-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="section-kicker">Showcase history</div>
            <h2 className="mt-2 font-heading text-3xl text-white md:text-4xl">Seeded reports that make the app feel lived-in</h2>
          </div>
          <div className="flex items-center gap-2 text-sm text-white/55">
            <Radar className="h-4 w-4 text-cyan-100" />
            Premium dashboard, print, share, and export flows included
          </div>
        </div>
        <HistoryList scans={showcaseScans} />
      </section>

      <section className="container relative z-10 mt-12">
        <div className="panel p-6 md:p-8">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="section-kicker">Operational posture</div>
              <div className="mt-2 font-heading text-3xl text-white">Hardening already built into the demo</div>
            </div>
            <Badge variant="accent">Queue-backed and workspace-aware</Badge>
          </div>
          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <div className="intel-card">
              <ShieldCheck className="h-5 w-5 text-cyan-100" />
              <div className="mt-4 font-heading text-xl text-white">Rate-limited scan requests</div>
              <p className="mt-2 text-sm leading-6 text-white/58">Abuse protection on scans, exports, shares, and workspace actions.</p>
            </div>
            <div className="intel-card">
              <Sparkles className="h-5 w-5 text-cyan-100" />
              <div className="mt-4 font-heading text-xl text-white">Recent-result reuse</div>
              <p className="mt-2 text-sm leading-6 text-white/58">Fast demos without hitting the same target repeatedly during a showcase.</p>
            </div>
            <div className="intel-card">
              <Database className="h-5 w-5 text-cyan-100" />
              <div className="mt-4 font-heading text-xl text-white">Audit-friendly history</div>
              <p className="mt-2 text-sm leading-6 text-white/58">Workspace activity captures scan, share, export, and access management events.</p>
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
