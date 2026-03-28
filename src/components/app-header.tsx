import Link from "next/link";
import type { Route } from "next";

import { AuthControls } from "@/components/auth-controls";
import { WorkspaceSwitcher } from "@/components/workspace-switcher";
import { Badge } from "@/components/ui/badge";
import { getViewerContext } from "@/lib/auth";
import { getAppCapabilities } from "@/lib/env";

export async function AppHeader() {
  const viewer = await getViewerContext();
  const capabilities = getAppCapabilities();

  return (
    <header className="sticky top-0 z-40 border-b border-white/8 bg-slate-950/72 backdrop-blur-2xl print:hidden">
      <div className="container py-4">
        <div className="panel-muted flex flex-wrap items-center justify-between gap-4 px-4 py-3 md:px-5">
          <div className="flex min-w-0 flex-1 items-center gap-4">
            <Link href="/" className="flex min-w-0 items-center gap-3">
              <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-cyan-300/20 bg-[linear-gradient(135deg,rgba(94,234,212,0.18),rgba(59,130,246,0.18))] font-heading text-sm font-bold text-cyan-50">
                BV
              </div>
              <div className="min-w-0">
                <div className="font-heading text-lg text-white">BreachVector</div>
                <div className="truncate text-[11px] uppercase tracking-[0.3em] text-white/35">
                  Security posture reviews
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-2 xl:flex">
              <Link href="/" className="rounded-full px-3 py-2 text-sm text-white/58 transition hover:bg-white/6 hover:text-white">
                Overview
              </Link>
              <Link href={"/history" as Route} className="rounded-full px-3 py-2 text-sm text-white/58 transition hover:bg-white/6 hover:text-white">
                History
              </Link>
              <Link href={"/account" as Route} className="rounded-full px-3 py-2 text-sm text-white/58 transition hover:bg-white/6 hover:text-white">
                Workspace
              </Link>
              <Link href={"/ops" as Route} className="rounded-full px-3 py-2 text-sm text-white/58 transition hover:bg-white/6 hover:text-white">
                Ops
              </Link>
            </nav>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-3">
            <div className="hidden items-center gap-2 2xl:flex">
              <Badge variant={capabilities.database ? "success" : "warning"}>
                {capabilities.database ? "Persistence live" : "Demo persistence"}
              </Badge>
              <Badge variant={capabilities.auth ? "accent" : "warning"}>
                {capabilities.auth ? "Identity on" : "Identity off"}
              </Badge>
              <Badge variant={capabilities.workerSecret ? "success" : "warning"}>
                {capabilities.workerSecret ? "Worker secured" : "Worker open in dev"}
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
