"use client";

import Link from "next/link";
import type { Route } from "next";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, ShieldCheck, Sparkles, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { WorkspaceSummary } from "@/lib/types";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    startTransition(async () => {
      try {
        const response = await fetch("/api/analyze", {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
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
    <form onSubmit={handleSubmit} className="panel-strong relative overflow-hidden p-6 md:p-7">
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-200/55 to-transparent" />
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="section-kicker">Launch a scan</div>
          <div className="mt-3 font-heading text-2xl text-white md:text-3xl">Passive website security review</div>
          <p className="mt-3 max-w-xl text-sm leading-6 text-white/62">
            Queue a safe, public-facing scan and turn raw transport and header signals into an executive-ready security report.
          </p>
        </div>
        <Badge variant="accent">Legal, lightweight, passive</Badge>
      </div>

      <div className="mt-6 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="panel-muted p-4">
          <div className="data-label">Target</div>
          <Input
            value={target}
            onChange={(event) => setTarget(event.target.value)}
            placeholder="Enter a domain or URL, e.g. stripe.com or https://vercel.com"
            inputMode="url"
            autoComplete="off"
            className="mt-3 border-white/10 bg-white/[0.04]"
          />
          <div className="mt-3 flex flex-wrap gap-2 text-xs text-white/45">
            <span className="rounded-full border border-white/10 px-3 py-1">HTTPS</span>
            <span className="rounded-full border border-white/10 px-3 py-1">TLS</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Security headers</span>
            <span className="rounded-full border border-white/10 px-3 py-1">Cookie flags</span>
            <span className="rounded-full border border-white/10 px-3 py-1">SPF / DMARC</span>
          </div>
        </div>

        <div className="panel-muted p-4">
          <div className="data-label">Destination</div>
          <div className="mt-3 flex items-center gap-3 rounded-[22px] border border-white/10 bg-black/20 px-4 py-4">
            <div className="grid h-11 w-11 place-items-center rounded-2xl border border-cyan-300/15 bg-cyan-300/10 text-cyan-50">
              <Users className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <div className="truncate font-heading text-lg text-white">
                {activeWorkspace?.name ?? "No workspace selected"}
              </div>
              <div className="mt-1 text-sm text-white/52">
                {activeWorkspace
                  ? `${activeWorkspace.role.toLowerCase()} access in ${activeWorkspace.type.toLowerCase()} workspace`
                  : "Choose or create a workspace before saving live scans."}
              </div>
            </div>
          </div>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm text-white/58">
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="data-label">Execution</div>
              <div className="mt-2 text-white">Queued jobs</div>
            </div>
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
              <div className="data-label">Reuse window</div>
              <div className="mt-2 text-white">Recent-result cache</div>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="flex flex-wrap items-center gap-2 text-xs text-white/45">
          <span>No active exploitation.</span>
          <span className="hidden sm:inline">Only public metadata and response inspection.</span>
        </div>
        <Button type="submit" size="lg" disabled={!canSubmit} className="min-w-[200px]">
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {isPending
            ? "Queueing"
            : !authEnabled
              ? "Enable auth to scan"
              : !signedIn
                ? "Sign in to scan"
                : !activeWorkspace
                  ? "Select a workspace"
                  : !canScan
                    ? "Viewer access only"
                    : "Queue scan"}
        </Button>
      </div>

      {!authEnabled ? (
        <div className="mt-5 rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          Live scans require authentication ownership. Configure Clerk to unlock signed-in scans.
        </div>
      ) : !signedIn ? (
        <div className="mt-5 rounded-[22px] border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-50">
          Sign in to create owned scans and save them to your workspace history.
          <Button asChild variant="ghost" size="sm" className="ml-2 h-auto px-2 py-0 text-cyan-50">
            <Link href={"/sign-in" as Route}>Open sign in</Link>
          </Button>
        </div>
      ) : !activeWorkspace ? (
        <div className="mt-5 rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          No active workspace is available yet. Create a workspace from your account page.
        </div>
      ) : !canScan ? (
        <div className="mt-5 rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
          Your current workspace role is view-only. Switch to a workspace where you can run scans.
        </div>
      ) : (
        <div className="mt-5 rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4" />
            New reports are queued, tracked, and saved into {activeWorkspace.name} for authorized teammates.
          </div>
        </div>
      )}

      {error ? (
        <div className="mt-4 rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </form>
  );
}
