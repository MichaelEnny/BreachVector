"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition, useEffect, useRef } from "react";
import {
  LoaderCircle,
  ShieldCheck,
  Sparkles,
  Users,
  ArrowRight,
  Terminal,
  Wifi,
  Lock,
  Globe,
  Cpu
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceSummary } from "@/lib/types";

const scanSignals = [
  { label: "HTTPS", icon: Lock },
  { label: "TLS", icon: ShieldCheck },
  { label: "Headers", icon: Globe },
  { label: "Cookies", icon: Cpu },
  { label: "DNS", icon: Wifi },
  { label: "security.txt", icon: Terminal }
];

const terminalLines = [
  { text: "Initializing passive scan engine...", type: "prompt" },
  { text: "Transport layer inspection ready", type: "ok" },
  { text: "Header analysis module loaded", type: "ok" },
  { text: "DNS posture checks enabled", type: "ok" },
  { text: "Awaiting target input", type: "warn" }
] as const;

export function AnalyzeForm({
  authEnabled,
  signedIn,
  activeWorkspace,
  canScan
}: {
  authEnabled: boolean;
  signedIn: boolean;
  activeWorkspace: WorkspaceSummary | null;
  canScan: boolean;
}) {
  const router = useRouter();
  const [target, setTarget] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [visibleLines, setVisibleLines] = useState(0);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const timer = setInterval(() => {
      setVisibleLines((prev) => {
        if (prev < terminalLines.length) {
          return prev + 1;
        }

        clearInterval(timer);
        return prev;
      });
    }, 340);

    return () => clearInterval(timer);
  }, []);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target })
        });

        const payload = (await response.json()) as {
          jobId?: string;
          status?: string;
          resultScanId?: string | null;
          error?: string;
        };

        if (!response.ok || !payload.jobId) {
          throw new Error(payload.error || "The scan could not be queued.");
        }

        if (payload.status === "COMPLETED" && payload.resultScanId) {
          router.push(`/scans/${payload.resultScanId}`);
          return;
        }

        router.push(`/jobs/${payload.jobId}` as Route);
      } catch (submissionError) {
        setError(
          submissionError instanceof Error
            ? submissionError.message
            : "The scan could not be queued."
        );
      }
    });
  }

  const canSubmit = authEnabled && signedIn && Boolean(target.trim()) && canScan && !isPending;

  return (
    <form
      ref={formRef}
      onSubmit={handleSubmit}
      className="form-shell relative overflow-hidden"
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/50 to-transparent" />
      <div
        className="pointer-events-none absolute right-0 top-0 h-48 w-48 rounded-bl-[36px] rounded-tr-[36px] opacity-30"
        style={{
          background: "radial-gradient(circle at top right, rgba(34,211,238,0.14), transparent 65%)"
        }}
      />

      <div className="relative z-10 p-7 md:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="section-kicker">Scan engine</div>
            <h2 className="mt-3 font-heading text-2xl leading-tight text-white md:text-[1.9rem]">
              Queue a passive surface review
            </h2>
            <p className="mt-2 text-sm leading-6 text-white/50">
              Public signals only - no intrusion, no noise.
            </p>
          </div>
          <Badge variant="accent" className="shrink-0">
            Passive only
          </Badge>
        </div>

        <div className="terminal-shell scanline mt-6 space-y-2 py-4">
          <div className="mb-3 flex items-center gap-2 border-b border-white/[0.06] pb-3">
            <div className="flex gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-rose-500/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="text-[10px] tracking-widest text-white/25">bv-scanner - passive mode</span>
          </div>
          {terminalLines.slice(0, visibleLines).map((line, i) => (
            <div
              key={i}
              className={`terminal-line ${
                line.type === "prompt"
                  ? "terminal-prompt"
                  : line.type === "ok"
                    ? "terminal-ok"
                    : "terminal-warn"
              } ${i === visibleLines - 1 ? "cursor-blink" : ""}`}
            >
              {line.text}
            </div>
          ))}
        </div>

        <div className="mt-5">
          <div className="data-label mb-3">Target domain or URL</div>
          <div className="relative">
            <Globe className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-white/30" />
            <Input
              value={target}
              onChange={(event) => setTarget(event.target.value)}
              placeholder="stripe.com or https://vercel.com"
              inputMode="url"
              autoComplete="off"
              className="h-14 rounded-[20px] border-white/[0.09] bg-white/[0.04] pl-11 text-base text-white placeholder:text-white/30 focus-visible:border-cyan-400/40 focus-visible:ring-1 focus-visible:ring-cyan-400/30"
            />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {scanSignals.map(({ label, icon: Icon }) => (
              <span key={label} className="signal-tag">
                <Icon className="h-3 w-3 opacity-60" />
                {label}
              </span>
            ))}
          </div>
        </div>

        {activeWorkspace && (
          <div className="mt-4 flex items-center gap-3 rounded-[18px] border border-white/[0.07] bg-white/[0.03] px-4 py-3">
            <div className="icon-box h-9 w-9 shrink-0">
              <Users className="h-4 w-4 text-cyan-200/70" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="data-label">Destination</div>
              <div className="mt-0.5 truncate text-sm font-medium text-white">{activeWorkspace.name}</div>
            </div>
            <div className="shrink-0 text-[10px] uppercase tracking-wider text-white/35">
              {activeWorkspace.role.toLowerCase()}
            </div>
          </div>
        )}

        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-white/35">
            No exploitation - Public metadata only - Legal-safe
          </p>
          <Button
            type="submit"
            size="lg"
            disabled={!canSubmit}
            className="group relative min-w-[180px] overflow-hidden rounded-full bg-gradient-to-r from-cyan-500 to-sky-500 font-semibold text-slate-950 shadow-cta-glow transition-all duration-200 hover:scale-[1.02] hover:shadow-[0_0_0_1px_rgba(34,211,238,0.5),0_12px_40px_rgba(34,211,238,0.35)] disabled:opacity-50 disabled:shadow-none disabled:hover:scale-100"
          >
            <span className="relative z-10 flex items-center gap-2">
              {isPending ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4 transition-transform group-hover:scale-110" />
              )}
              {isPending
                ? "Queueing scan..."
                : !authEnabled
                  ? "Enable auth to scan"
                  : !signedIn
                    ? "Sign in to scan"
                    : !activeWorkspace
                      ? "Select a workspace"
                      : !canScan
                        ? "Viewer access only"
                        : "Run scan"}
              {canSubmit && !isPending ? (
                <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              ) : null}
            </span>
            <span className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 group-hover:translate-x-full" />
          </Button>
        </div>

        {!authEnabled ? (
          <StatusBanner variant="warning">
            Live scans require authentication. Configure Clerk to unlock signed-in scans.
          </StatusBanner>
        ) : !signedIn ? (
          <StatusBanner variant="info">
            Sign in to create owned scans and save them to your workspace history.{" "}
            <Link
              href={"/sign-in" as Route}
              className="ml-1 underline underline-offset-2 transition-colors hover:text-white"
            >
              Sign in {"->"}
            </Link>
          </StatusBanner>
        ) : !activeWorkspace ? (
          <StatusBanner variant="danger">
            No active workspace yet. Create one from your account page.
          </StatusBanner>
        ) : !canScan ? (
          <StatusBanner variant="warning">
            Your workspace role is view-only. Switch to a workspace where you can run scans.
          </StatusBanner>
        ) : (
          <StatusBanner variant="success">
            <ShieldCheck className="mr-1.5 inline h-3.5 w-3.5 -mt-px" />
            Reports are tracked and saved into {activeWorkspace.name} for authorized teammates.
          </StatusBanner>
        )}

        {error ? <StatusBanner variant="danger">{error}</StatusBanner> : null}
      </div>
    </form>
  );
}

function StatusBanner({
  variant,
  children
}: {
  variant: "info" | "success" | "warning" | "danger";
  children: React.ReactNode;
}) {
  const styles = {
    info: "border-sky-400/20 bg-sky-400/[0.08] text-sky-100",
    success: "border-emerald-400/20 bg-emerald-400/[0.08] text-emerald-100",
    warning: "border-amber-400/20 bg-amber-400/[0.08] text-amber-100",
    danger: "border-rose-400/20 bg-rose-400/[0.08] text-rose-100"
  };

  return (
    <div className={`mt-4 rounded-[18px] border px-4 py-3 text-sm leading-6 ${styles[variant]}`}>
      {children}
    </div>
  );
}
