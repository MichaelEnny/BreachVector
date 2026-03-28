import Link from "next/link";
import { ArrowRight, Clock3, Radar, Users } from "lucide-react";

import { AuthDisabledCard } from "@/components/auth-disabled-card";
import { HistoryList } from "@/components/history-list";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerContext } from "@/lib/auth";
import { getUserDailyScanCount, getWorkspaceScans } from "@/lib/data/scans";
import { DAILY_SCAN_LIMIT, getRemainingDailyScans } from "@/lib/limits";

export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const viewer = await getViewerContext();

  if (!viewer.authEnabled) {
    return (
      <main className="container py-16">
        <AuthDisabledCard />
      </main>
    );
  }

  if (!viewer.userId) {
    return null;
  }

  if (!viewer.activeWorkspace) {
    return (
      <main className="container py-16">
        <Card>
          <CardHeader>
            <CardTitle>No workspace selected</CardTitle>
            <CardDescription>Create or select a workspace before reviewing history.</CardDescription>
          </CardHeader>
        </Card>
      </main>
    );
  }

  const [scans, dailyCount] = await Promise.all([
    getWorkspaceScans(viewer.activeWorkspace.id, viewer.userId, 24),
    getUserDailyScanCount(viewer.userId)
  ]);

  return (
    <main className="container py-10 md:py-12">
      <section className="panel-strong surface-radial overflow-hidden p-7 md:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:items-start">
          <div>
            <div className="section-kicker">Workspace history</div>
            <h1 className="mt-4 text-balance font-heading text-4xl text-white md:text-6xl">{viewer.activeWorkspace.name}</h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/66">
              Every live BreachVector scan belongs to a user and a workspace. This history surface shows the reports visible to the current membership.
            </p>
          </div>
          <Card className="bg-white/[0.05]">
            <CardHeader>
              <div className="section-kicker">Usage snapshot</div>
              <CardTitle className="mt-2">Current operator limits</CardTitle>
              <CardDescription>Per-user daily limit plus the active workspace context.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="data-label">Used</div>
                <div className="mt-2 font-heading text-3xl text-white">{dailyCount}</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="data-label">Remaining</div>
                <div className="mt-2 font-heading text-3xl text-white">{getRemainingDailyScans(dailyCount)}</div>
              </div>
              <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                <div className="data-label">Limit</div>
                <div className="mt-2 font-heading text-3xl text-white">{DAILY_SCAN_LIMIT}</div>
              </div>
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-8 grid gap-5 md:grid-cols-3">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <Clock3 className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="data-label">Visible reports</div>
              <div className="mt-2 font-heading text-3xl text-white">{scans.length}</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
              <Users className="h-5 w-5 text-cyan-100" />
            </div>
            <div>
              <div className="data-label">Membership</div>
              <div className="mt-2 text-sm leading-6 text-white/65">
                {viewer.activeWorkspace.role.toLowerCase()} in {viewer.activeWorkspace.type.toLowerCase()} workspace
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5">
            <div className="data-label">Next action</div>
            <Button asChild className="mt-4 w-full">
              <Link href="/">
                Run another scan
                <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>

      <section className="mt-8 panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="section-kicker">Access model</div>
            <div className="mt-2 font-heading text-2xl text-white">Workspace-scoped visibility</div>
          </div>
          <Badge variant={viewer.activeWorkspace.type === "TEAM" ? "accent" : "default"}>
            {viewer.activeWorkspace.memberCount} members
          </Badge>
        </div>
        <div className="mt-5 grid gap-3 md:grid-cols-2">
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
            Members of this workspace can open shared live reports without switching back to the scan creator&apos;s account.
          </div>
          <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm leading-6 text-white/60">
            Share links, exports, and history stay tied to workspace activity while preserving who created each scan.
          </div>
        </div>
        <div className="mt-5 flex items-center gap-2 text-sm text-white/55">
          <Radar className="h-4 w-4 text-cyan-100" />
          Audit events and report actions now read like a real operations surface.
        </div>
      </section>

      <section className="mt-8">
        <HistoryList scans={scans} />
      </section>
    </main>
  );
}
