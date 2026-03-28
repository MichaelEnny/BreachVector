import Link from "next/link";
import type { Route } from "next";
import {
  ArrowRight,
  Bot,
  CheckCircle2,
  Database,
  FileOutput,
  Fingerprint,
  Radar,
  Shield,
  ShieldCheck,
  Sparkles,
  Users,
  Workflow,
  WandSparkles,
  Zap,
  Lock,
  Globe,
  BarChart3,
  Layers,
  ExternalLink
} from "lucide-react";

import { AnalyzeForm } from "@/components/analyze-form";
import { HistoryList } from "@/components/history-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { getViewerContext } from "@/lib/auth";
import { getShowcaseScans, getWorkspaceScans } from "@/lib/data/scans";
import { canCreateWorkspaceScan } from "@/lib/data/workspaces";
import { getAppCapabilities } from "@/lib/env";

export const dynamic = "force-dynamic";

const heroMetrics = [
  {
    value: "10",
    label: "Signal families",
    copy: "Transport, headers, cookies, disclosure files, and DNS posture — one sweep, zero noise."
  },
  {
    value: "4",
    label: "Handoff views",
    copy: "Dashboard, print layout, PDF export, and tokenized shared report links."
  },
  {
    value: "2",
    label: "Audience layers",
    copy: "Executive narrative for the room. Technical depth for the implementer."
  }
];

const proofCards = [
  {
    icon: Shield,
    color: "cyan",
    title: "Passive by design",
    copy: "Only public-facing signals. No exploitation, fuzzing, or intrusive scanning paths. Legal-safe for showcase and real engagements alike."
  },
  {
    icon: Bot,
    color: "violet",
    title: "AI that actually earns it",
    copy: "Deterministic checks feed a cleaner executive summary, sharper findings narrative, and actionable remediation plan."
  },
  {
    icon: Users,
    color: "emerald",
    title: "Product depth, not a script",
    copy: "Ownership, workspaces, invites, sharing, exports, and full scan history — already part of the core experience."
  },
  {
    icon: Radar,
    color: "sky",
    title: "Operationally real",
    copy: "Queued jobs, retries, audit events, and an ops surface make every demo feel production-minded, not prototype-minded."
  }
];

const colorMap: Record<string, { icon: string; ring: string; bg: string; dot: string }> = {
  cyan:   { icon: "text-cyan-200",   ring: "border-cyan-300/18",    bg: "bg-cyan-300/[0.1]",    dot: "bg-cyan-300 shadow-[0_0_14px_rgba(125,211,252,0.65)]"   },
  violet: { icon: "text-violet-200", ring: "border-violet-400/18",  bg: "bg-violet-400/[0.1]",  dot: "bg-violet-300 shadow-[0_0_14px_rgba(196,181,253,0.55)]" },
  emerald:{ icon: "text-emerald-200",ring: "border-emerald-400/18", bg: "bg-emerald-400/[0.1]", dot: "bg-emerald-300 shadow-[0_0_14px_rgba(110,231,183,0.65)]" },
  sky:    { icon: "text-sky-200",    ring: "border-sky-400/18",     bg: "bg-sky-400/[0.1]",     dot: "bg-sky-300 shadow-[0_0_14px_rgba(125,211,252,0.55)]"   }
};

const ritualSteps = [
  {
    n: "01",
    title: "Point at a public target",
    copy: "Enter a domain or URL and queue a passive review. No unsafe or noisy behavior — ever."
  },
  {
    n: "02",
    title: "Surface signals become a brief",
    copy: "Transport, browser, cookie, DNS, and disclosure-file signals resolve into a crisp score and narrative."
  },
  {
    n: "03",
    title: "Hand off a report that lands",
    copy: "Open the dashboard, print it, export the PDF, or share a read-only link for stakeholder review."
  }
];

const operatingLayers = [
  {
    icon: Database,
    title: "Persistent history",
    copy: "Every scan stays attached to its owner and workspace. Nothing disappears after a one-off request."
  },
  {
    icon: Workflow,
    title: "Durable job flow",
    copy: "Requests create tracked jobs. Workers claim them. Recent results can be reused intelligently during demos."
  },
  {
    icon: FileOutput,
    title: "Report handoff",
    copy: "Exported PDFs and share links make every result usable outside the app, not trapped inside it."
  }
];

const signalRows = [
  { label: "HTTPS and redirect posture",    dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]" },
  { label: "TLS lifecycle and expiry",       dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]" },
  { label: "Header and cookie hardening",    dot: "bg-cyan-300 shadow-[0_0_12px_rgba(125,211,252,0.65)]"    },
  { label: "SPF, DMARC, MTA-STS, and CAA",  dot: "bg-cyan-300 shadow-[0_0_12px_rgba(125,211,252,0.65)]"    },
  { label: "security.txt and robots.txt",    dot: "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.55)]"  },
  { label: "PDF export and read-only sharing", dot: "bg-violet-300 shadow-[0_0_12px_rgba(196,181,253,0.55)]"}
];

const trustStrip = [
  { icon: WandSparkles, label: "Strong visual identity" },
  { icon: ShieldCheck,  label: "Safe analysis model"    },
  { icon: Database,     label: "Ownership & collaboration" },
  { icon: Radar,        label: "Observable job flow"    },
  { icon: Zap,          label: "AI narrative engine"    }
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
    <main className="relative overflow-hidden pb-32">

      {/* ─── Background ambient orbs ──────────────────────────────────────── */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <div className="threat-orb animate-drift h-[36rem] w-[36rem] bg-cyan-400/[0.07]"
          style={{ top: "-8rem", left: "-12rem" }} />
        <div className="threat-orb animate-float h-[44rem] w-[44rem] bg-sky-400/[0.06]"
          style={{ top: "4rem", right: "-16rem" }} />
        <div className="threat-orb animate-floatSlow h-[28rem] w-[56rem] bg-violet-500/[0.04]"
          style={{ top: "36rem", left: "50%", transform: "translateX(-50%)" }} />
        <div className="threat-orb animate-drift h-[32rem] w-[32rem] bg-emerald-400/[0.04]"
          style={{ bottom: "16rem", right: "-10rem", animationDelay: "4s" }} />
      </div>

      {/* ─── HERO ─────────────────────────────────────────────────────────── */}
      <section className="container relative z-10 pt-10 md:pt-14">

        {/* Status badges row */}
        <div className="mb-8 flex flex-wrap items-center gap-2.5">
          <Badge variant="accent" className="gap-1.5">
            <span className="status-lamp h-1.5 w-1.5 bg-cyan-300 shadow-[0_0_8px_rgba(125,211,252,0.9)]" />
            AI-powered passive security review
          </Badge>
          <Badge variant={capabilities.database ? "success" : "warning"}>
            {capabilities.database ? "Persistent mode" : "Demo persistence mode"}
          </Badge>
          <Badge variant={capabilities.openai ? "accent" : "warning"}>
            {capabilities.openai ? "Narrative AI on" : "Template AI fallback"}
          </Badge>
        </div>

        <div className="grid gap-8 xl:grid-cols-[1.05fr_0.95fr] xl:items-start">

          {/* Left — narrative */}
          <div className="hero-shell relative overflow-hidden p-8 md:p-12">
            {/* Corner glow accent */}
            <div className="pointer-events-none absolute -right-20 -top-20 h-64 w-64 rounded-full bg-cyan-400/[0.08] blur-3xl" />

            <div className="section-kicker">BreachVector</div>

            <h1 className="mt-5 max-w-2xl text-balance font-heading text-[3.2rem] leading-[0.93] tracking-tight md:text-[4.4rem] xl:text-[5.2rem]">
              <span className="text-white">Security posture reviews that</span>
              <br />
              <span className="text-gradient">look funded.</span>
            </h1>

            <p className="mt-7 max-w-xl text-balance text-lg leading-[1.75] text-white/55 md:text-xl">
              BreachVector turns raw public-facing checks into a confident product artifact — scored reports, clean remediation, team workspaces, and visual presentation strong enough for a demo day table.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <Button
                asChild
                size="lg"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-7 font-semibold text-slate-950 shadow-cta-glow transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_12px_40px_rgba(34,211,238,0.32)]"
              >
                <Link href={leadDemo ? (`/scans/${leadDemo.id}` as Route) : ("/" as Route)}>
                  <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
                  Open showcase report
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full border-white/10 bg-white/[0.06] text-white/80 hover:bg-white/[0.1] hover:text-white">
                <Link href={"/history" as Route}>
                  See it in motion
                  <ExternalLink className="h-3.5 w-3.5 opacity-60" />
                </Link>
              </Button>
            </div>

            {/* Trust chips */}
            <div className="mt-7 flex flex-wrap gap-2.5">
              <div className="hero-chip text-sm text-white/55">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-300" />
                Passive-only, legal-safe
              </div>
              <div className="hero-chip text-sm text-white/55">
                <Fingerprint className="h-3.5 w-3.5 text-cyan-300" />
                Executive + technical in one artifact
              </div>
            </div>

            {/* Glow divider */}
            <div className="glow-rule mt-9" />

            {/* Metrics grid */}
            <div className="mt-9 grid gap-4 md:grid-cols-3">
              {heroMetrics.map((metric) => (
                <div key={metric.label} className="story-card p-5">
                  <div className="data-label">{metric.label}</div>
                  <div className="mt-4 font-heading text-[2.6rem] leading-none text-white">{metric.value}</div>
                  <p className="mt-3 text-sm leading-6 text-white/48">{metric.copy}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Right — form + preview cards */}
          <div className="grid gap-5">
            <AnalyzeForm
              authEnabled={viewer.authEnabled}
              signedIn={Boolean(viewer.userId)}
              activeWorkspace={viewer.activeWorkspace}
              canScan={canScan}
            />

            {/* Lead artifact + signal surface */}
            <div className="grid gap-5 sm:grid-cols-2">
              {/* Lead artifact */}
              <div className="story-card p-6">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="section-kicker">Lead artifact</div>
                    <div className="mt-2.5 font-heading text-xl leading-tight text-white">
                      {leadDemo?.hostname ?? "Showcase ready"}
                    </div>
                  </div>
                  <Badge variant="accent" className="shrink-0 text-[10px]">Demo-first</Badge>
                </div>
                <p className="mt-4 text-sm leading-6 text-white/50">
                  {leadDemo?.executiveSummary ??
                    "Seeded showcase reports keep the product alive before the first live scan."}
                </p>
                <div className="mt-5 space-y-2.5 text-sm">
                  {[
                    { dot: "bg-emerald-300 shadow-[0_0_12px_rgba(110,231,183,0.65)]", text: "Score, findings, and remediation" },
                    { dot: "bg-cyan-300 shadow-[0_0_12px_rgba(125,211,252,0.65)]",    text: "Print-ready PDF handoff" },
                    { dot: "bg-amber-300 shadow-[0_0_12px_rgba(252,211,77,0.5)]",     text: "Workspace-aware sharing" }
                  ].map(({ dot, text }) => (
                    <div key={text} className="flex items-center gap-3 text-white/52">
                      <span className={`status-lamp ${dot}`} />
                      {text}
                    </div>
                  ))}
                </div>
              </div>

              {/* Signal surface */}
              <div className="story-card p-6">
                <div className="section-kicker">Signal surface</div>
                <div className="mt-2.5 font-heading text-xl leading-tight text-white">
                  Everything needed to trust the demo
                </div>
                <div className="mt-4 space-y-2">
                  {signalRows.map((row) => (
                    <div
                      key={row.label}
                      className="flex items-center gap-3 rounded-[16px] border border-white/[0.07] bg-black/15 px-3.5 py-2.5 text-xs text-white/55"
                    >
                      <span className={`status-lamp shrink-0 ${row.dot}`} />
                      {row.label}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP ──────────────────────────────────────────────────── */}
      <section className="container relative z-10 mt-8">
        <div className="story-card flex flex-wrap items-center gap-x-8 gap-y-3 px-6 py-4">
          <span className="section-kicker text-[9.5px]">Why it lands in a room</span>
          {trustStrip.map(({ icon: Icon, label }) => (
            <span key={label} className="inline-flex items-center gap-2 text-sm text-white/50">
              <Icon className="h-3.5 w-3.5 text-cyan-300/80" />
              {label}
            </span>
          ))}
        </div>
      </section>

      {/* ─── WHY IT FEELS EXPENSIVE ──────────────────────────────────────── */}
      <section className="container relative z-10 mt-20">

        {/* Section header */}
        <div className="mb-12 text-center">
          <div className="section-kicker mx-auto w-fit">Why it feels expensive</div>
          <h2 className="mx-auto mt-5 max-w-3xl text-balance font-heading text-[2.4rem] leading-[1.08] text-white md:text-[3.2rem]">
            It behaves like a real security product,{" "}
            <span className="text-gradient-warm">not a one-screen trick.</span>
          </h2>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-lg leading-[1.75] text-white/50">
            The strongest part of BreachVector is the coherence between design and engineering depth. The story holds together from input to job orchestration to report handoff to team operations.
          </p>
        </div>

        {/* Feature cards — 2×2 bento */}
        <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
          {proofCards.map((card) => {
            const Icon = card.icon;
            const c = colorMap[card.color];
            return (
              <div key={card.title} className="feature-card p-7">
                <div className={`icon-box-accent h-12 w-12 ${c.bg} ${c.ring}`}>
                  <Icon className={`h-5 w-5 ${c.icon}`} />
                </div>
                <div className="mt-6 font-heading text-xl leading-tight text-white">{card.title}</div>
                <p className="mt-3 text-sm leading-7 text-white/52">{card.copy}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* ─── EXPERIENCE ARC ───────────────────────────────────────────────── */}
      <section className="container relative z-10 mt-20">
        <div className="grid gap-8 lg:grid-cols-[1.06fr_0.94fr] lg:items-start">

          {/* Steps */}
          <div className="panel p-8 md:p-10">
            <div className="section-kicker">Experience arc</div>
            <h2 className="mt-5 max-w-xl text-balance font-heading text-[2.2rem] leading-[1.1] text-white md:text-[2.8rem]">
              From target input to polished handoff
            </h2>
            <p className="mt-4 max-w-lg text-base leading-[1.75] text-white/52">
              Every screen tells the same story — the landing page is no exception.
            </p>

            <div className="mt-8 space-y-4">
              {ritualSteps.map((step, index) => (
                <div key={step.title} className="story-card flex items-start gap-5 p-5 md:p-6">
                  <div className="step-number h-11 w-11 shrink-0">{step.n}</div>
                  <div>
                    <div className="font-heading text-lg text-white">{step.title}</div>
                    <p className="mt-1.5 text-sm leading-6 text-white/52">{step.copy}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Operating layers */}
          <div className="grid gap-5">
            {operatingLayers.map((layer) => {
              const Icon = layer.icon;
              return (
                <div key={layer.title} className="feature-card p-7">
                  <div className="flex items-start gap-5">
                    <div className="icon-box h-12 w-12 shrink-0">
                      <Icon className="h-5 w-5 text-cyan-200/80" />
                    </div>
                    <div>
                      <div className="font-heading text-xl text-white">{layer.title}</div>
                      <p className="mt-2.5 text-sm leading-7 text-white/52">{layer.copy}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ─── WORKSPACE (authenticated) ────────────────────────────────────── */}
      {viewer.userId && viewer.activeWorkspace ? (
        <section className="container relative z-10 mt-20">
          <div className="grid gap-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
            <div className="panel p-8 md:p-10">
              <div className="section-kicker">Current workspace</div>
              <h2 className="mt-5 font-heading text-3xl text-white md:text-4xl">{viewer.activeWorkspace.name}</h2>
              <p className="mt-4 text-sm leading-7 text-white/54">
                {viewer.activeWorkspace.type === "PERSONAL"
                  ? "Personal workspaces keep authored scans private by default while keeping the dashboard active and organized."
                  : "Team workspaces let collaborators review the same scan history, export artifacts, and share reports without leaving the product."}
              </p>
              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="story-card p-4">
                  <div className="data-label">Role</div>
                  <div className="mt-2 text-base text-white">{viewer.activeWorkspace.role.toLowerCase()}</div>
                </div>
                <div className="story-card p-4">
                  <div className="data-label">Type</div>
                  <div className="mt-2 text-base text-white">{viewer.activeWorkspace.type.toLowerCase()}</div>
                </div>
              </div>
              <div className="mt-7 flex flex-wrap gap-3">
                <Button asChild className="rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 font-semibold text-slate-950 hover:opacity-90">
                  <Link href={"/history" as Route}>Open workspace history</Link>
                </Button>
                <Button asChild variant="secondary" className="rounded-full border-white/10 bg-white/[0.06] hover:bg-white/[0.1]">
                  <Link href={"/account" as Route}>Manage team</Link>
                </Button>
              </div>
            </div>
            <HistoryList scans={workspaceScans} />
          </div>
        </section>
      ) : null}

      {/* ─── SHOWCASE HISTORY ─────────────────────────────────────────────── */}
      <section className="container relative z-10 mt-20">

        {/* Section header */}
        <div className="mb-10 flex flex-wrap items-end justify-between gap-6">
          <div>
            <div className="section-kicker">Showcase history</div>
            <h2 className="mt-5 max-w-3xl text-balance font-heading text-[2.2rem] leading-[1.1] text-white md:text-[3rem]">
              Seeded reports make the product feel{" "}
              <span className="text-gradient">lived-in</span>{" "}
              before the first judge types a URL.
            </h2>
          </div>
          <div className="hero-chip text-sm text-white/50">
            <Radar className="h-3.5 w-3.5 text-cyan-300/80" />
            Dashboard · print · share · export · workspaces
          </div>
        </div>

        <HistoryList scans={showcaseScans} />
      </section>

      {/* ─── BOTTOM CTA BAND ─────────────────────────────────────────────── */}
      <section className="container relative z-10 mt-24">
        <div className="panel-strong relative overflow-hidden px-8 py-14 text-center md:px-16 md:py-20">
          {/* Background orb inside card */}
          <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-[36px]">
            <div className="threat-orb h-[28rem] w-[48rem] bg-cyan-400/[0.06]"
              style={{ top: "50%", left: "50%", transform: "translate(-50%, -50%)" }} />
          </div>

          {/* Top + bottom glow rules */}
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent rounded-t-[36px]" />
          <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-violet-400/25 to-transparent rounded-b-[36px]" />

          <div className="relative z-10">
            <div className="section-kicker mx-auto w-fit">Ready to see it</div>
            <h2 className="mx-auto mt-6 max-w-2xl text-balance font-heading text-[2.4rem] leading-[1.08] text-white md:text-[3.4rem]">
              A security review product that{" "}
              <span className="text-gradient">ships with confidence.</span>
            </h2>
            <p className="mx-auto mt-5 max-w-xl text-balance text-lg leading-[1.75] text-white/50">
              Explore the showcase report, see how scan history works, or queue a live review against any public target.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <Button
                asChild
                size="lg"
                className="group relative overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 px-8 font-semibold text-slate-950 shadow-cta-glow transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_12px_40px_rgba(34,211,238,0.32)]"
              >
                <Link href={leadDemo ? (`/scans/${leadDemo.id}` as Route) : ("/" as Route)}>
                  <Sparkles className="h-4 w-4" />
                  Open showcase report
                  <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
                  <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/25 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="secondary" className="rounded-full border-white/10 bg-white/[0.06] text-white/75 hover:bg-white/[0.1] hover:text-white">
                <Link href={"/history" as Route}>
                  Browse history
                </Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

    </main>
  );
}
