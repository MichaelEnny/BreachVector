import Image from "next/image";
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
    <header className="sticky top-0 z-40 print:hidden">
      <div className="absolute inset-0 border-b border-white/[0.06] bg-[rgba(4,8,20,0.82)] backdrop-blur-2xl" />
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/20 to-transparent" />

      <div className="container relative py-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex min-w-0 flex-1 items-center gap-6">
            <Link href="/" className="group flex min-w-0 items-center gap-3">
              <div className="relative overflow-hidden transition-all duration-200 group-hover:drop-shadow-[0_0_18px_rgba(34,211,238,0.14)]">
                <Image
                  src="/logo-wordmark.png"
                  alt="BreachVector"
                  width={1760}
                  height={500}
                  priority
                  className="h-10 w-auto md:h-11"
                />
              </div>
              <div className="hidden min-w-0 xl:block">
                <div className="text-[9.5px] uppercase tracking-[0.34em] text-white/32">
                  Security posture reviews
                </div>
              </div>
            </Link>

            <nav className="hidden items-center gap-1 xl:flex">
              {[
                { label: "Overview", href: "/" },
                { label: "History", href: "/history" },
                { label: "Workspace", href: "/account" },
                { label: "Ops", href: "/ops" }
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

          <div className="flex flex-wrap items-center justify-end gap-3">
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