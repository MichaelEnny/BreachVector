import Link from "next/link";
import type { Route } from "next";
import { Shield } from "lucide-react";

import { AuthControls } from "@/components/auth-controls";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { getViewerContext } from "@/lib/auth";
import { getAppCapabilities } from "@/lib/env";

export async function AppHeader() {
  const viewer = await getViewerContext();
  const capabilities = getAppCapabilities();

  return (
    <header className="sticky top-0 z-40 print:hidden">
      {/* Backdrop blur layer */}
      <div className="absolute inset-0 border-b border-white/[0.06] bg-[rgba(4,8,20,0.82)] backdrop-blur-2xl" />

      {/* Top glow edge */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />

      <div className="container relative py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">

          {/* Logo + nav */}
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              {/* Logo mark */}
              <div className="relative grid h-10 w-10 shrink-0 place-items-center rounded-[14px] transition-all duration-200 group-hover:shadow-[0_0_24px_rgba(34,211,238,0.3)]"
                style={{
                  background: "linear-gradient(145deg, rgba(34,211,238,0.22), rgba(56,189,248,0.14))",
                  border: "1px solid rgba(56,189,248,0.25)",
                  boxShadow: "inset 0 1px 0 rgba(255,255,255,0.1), 0 0 20px rgba(34,211,238,0.12)"
                }}
              >
                <Shield className="h-4.5 w-4.5 text-cyan-200" style={{ height: "1.1rem", width: "1.1rem" }} />
                {/* Live pulse */}
                <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.9)]" style={{ animation: "pulseSoft 2.5s ease-in-out infinite" }} />
              </div>

              {/* Wordmark */}
              <div className="min-w-0">
                <div className="font-heading text-[1.05rem] font-bold leading-tight tracking-tight text-white">
                  BreachVector
                </div>
                <div className="text-[9.5px] uppercase tracking-[0.34em] text-white/32">
                  Security posture reviews
                </div>
              </div>
            </Link>

            {/* Nav links */}
            <nav className="hidden items-center gap-1 xl:flex">
              {[
                { label: "Overview",  href: "/" },
                { label: "History",   href: "/history" },
                { label: "Workspace", href: "/account" },
                { label: "Ops",       href: "/ops" }
              ].map(({ label, href }) => (
                <Link
                  key={label}
                  href={href as Route}
                  className="rounded-full px-3.5 py-2 text-sm text-white/50 transition-all duration-150 hover:bg-white/[0.06] hover:text-white/90"
                >
                  {label}
                </Link>
              ))}
            </nav>
          </div>

          {/* Right side */}
          <div className="flex flex-wrap items-center justify-end gap-3">
            {/* Capability badges — only on very wide screens */}
            <div className="hidden items-center gap-2 2xl:flex">
              <Badge variant={capabilities.database ? "success" : "warning"}>
                {capabilities.database ? "Persistence live" : "Demo persistence"}
              </Badge>
              <Badge variant={capabilities.auth ? "accent" : "warning"}>
                {capabilities.auth ? "Identity on" : "Identity off"}
              </Badge>
              <Badge variant={capabilities.workerSecret ? "success" : "warning"}>
                {capabilities.workerSecret ? "Worker secured" : "Worker open"}
              </Badge>
              {viewer.activeWorkspace ? <Badge>{viewer.activeWorkspace.name}</Badge> : null}
            </div>

            {viewer.userId && viewer.workspaces.length > 0 ? (
              <WorkspaceSwitcher
                workspaces={viewer.workspaces}
                activeWorkspaceId={viewer.activeWorkspace?.id ?? null}
              />
            ) : null}

            <AuthControls authEnabled={viewer.authEnabled} signedIn={Boolean(viewer.userId)} />
          </div>
        </div>
      </div>
    </header>
  );
}
