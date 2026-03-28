import Link from "next/link";
import type { Route } from "next";
import { Activity, ArrowRight, Building2, LockKeyhole, Radar, UserRound, Users } from "lucide-react";

import { AuthDisabledCard } from "@/components/auth-disabled-card";
import { CreateWorkspaceForm } from "@/components/create-workspace-form";
import { WorkspaceTeamManager } from "@/components/workspace-team-manager";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { getViewerContext } from "@/lib/auth";
import { getWorkspaceAuditEvents } from "@/lib/data/audit";
import { getUserDailyScanCount, getUserScans } from "@/lib/data/scans";
import {
  canInviteToWorkspace,
  canManageWorkspaceMembers,
  getWorkspaceInvites,
  getWorkspaceMembers
} from "@/lib/data/workspaces";
import { DAILY_SCAN_LIMIT, getRemainingDailyScans } from "@/lib/limits";
import { formatDateTime } from "@/lib/utils";

const actionLabels: Record<string, string> = {
  SCAN_REQUESTED: "Scan requested",
  SCAN_STARTED: "Scan started",
  SCAN_COMPLETED: "Scan completed",
  SCAN_FAILED: "Scan failed",
  SCAN_REUSED: "Recent result reused",
  SCAN_RETRIED: "Scan retried",
  SHARE_CREATED: "Share link updated",
  SHARE_REVOKED: "Share link revoked",
  SHARE_OPENED: "Shared report opened",
  REPORT_EXPORTED: "PDF exported",
  RATE_LIMIT_TRIGGERED: "Rate limit triggered",
  WORKSPACE_CREATED: "Workspace created",
  WORKSPACE_SWITCHED: "Workspace switched",
  INVITE_CREATED: "Invite created",
  INVITE_ACCEPTED: "Invite accepted",
  INVITE_REVOKED: "Invite revoked",
  INVITE_REFRESHED: "Invite refreshed",
  MEMBER_ROLE_UPDATED: "Member role updated",
  MEMBER_REMOVED: "Member removed"
};

export const dynamic = "force-dynamic";

export default async function AccountPage() {
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

  const activeWorkspace = viewer.activeWorkspace;
  const activeRole = activeWorkspace?.role ?? null;

  const [dailyCount, scans, auditEvents, members, invites] = await Promise.all([
    getUserDailyScanCount(viewer.userId),
    getUserScans(viewer.userId, 5),
    activeWorkspace ? getWorkspaceAuditEvents(activeWorkspace.id, 6) : Promise.resolve([]),
    activeWorkspace ? getWorkspaceMembers(activeWorkspace.id, viewer.userId) : Promise.resolve([]),
    activeWorkspace ? getWorkspaceInvites(activeWorkspace.id, viewer.userId) : Promise.resolve([])
  ]);

  return (
    <main className="container py-10 md:py-12">
      <section className="panel-strong surface-radial overflow-hidden p-7 md:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-start">
          <div>
            <div className="section-kicker">Account and workspaces</div>
            <h1 className="mt-4 text-balance font-heading text-4xl text-white md:text-6xl">
              {viewer.firstName ? `${viewer.firstName}'s operating layer` : "Your operating layer"}
            </h1>
            <p className="mt-5 max-w-3xl text-lg leading-8 text-white/66">
              Identity, workspace memberships, team administration, audit visibility, and authored scan activity now live in one place.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <div className="panel-muted p-4">
                <div className="data-label">Plan</div>
                <div className="mt-2 font-heading text-3xl text-white">Free</div>
                <div className="mt-2"><Badge variant="accent">Workspace mode</Badge></div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">24h usage</div>
                <div className="mt-2 font-heading text-3xl text-white">{dailyCount}/{DAILY_SCAN_LIMIT}</div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">Remaining</div>
                <div className="mt-2 font-heading text-3xl text-white">{getRemainingDailyScans(dailyCount)}</div>
              </div>
              <div className="panel-muted p-4">
                <div className="data-label">Workspaces</div>
                <div className="mt-2 font-heading text-3xl text-white">{viewer.workspaces.length}</div>
              </div>
            </div>
          </div>

          <Card className="bg-white/[0.05]">
            <CardHeader>
              <div className="section-kicker">Identity</div>
              <CardTitle className="mt-2">Current operator profile</CardTitle>
              <CardDescription>Used for ownership, invites, and workspace access.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3 text-white">
                  <UserRound className="h-4 w-4 text-cyan-100" />
                  <span className="font-medium">Name</span>
                </div>
                <div className="mt-3 text-sm text-white/62">
                  {[viewer.firstName, viewer.lastName].filter(Boolean).join(" ") || "Clerk user"}
                </div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex items-center gap-3 text-white">
                  <LockKeyhole className="h-4 w-4 text-cyan-100" />
                  <span className="font-medium">Email</span>
                </div>
                <div className="mt-3 text-sm text-white/62">{viewer.emailAddress ?? "Unknown"}</div>
              </div>
              {activeWorkspace ? (
                <div className="rounded-[24px] border border-cyan-300/10 bg-cyan-300/6 p-4">
                  <div className="data-label">Active workspace</div>
                  <div className="mt-2 font-heading text-xl text-white">{activeWorkspace.name}</div>
                  <div className="mt-2 text-sm text-white/62">
                    {activeWorkspace.role.toLowerCase()} in a {activeWorkspace.type.toLowerCase()} workspace.
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        </div>
      </section>

      <section className="mt-10 grid gap-8 lg:grid-cols-[1.15fr_0.85fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Memberships</div>
            <CardTitle className="mt-2">Your workspace access map</CardTitle>
            <CardDescription>Switching workspaces changes where scans land and who can view them.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {viewer.workspaces.map((workspace) => (
              <div key={workspace.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2 font-heading text-lg text-white">
                      <Building2 className="h-4 w-4 text-cyan-100" />
                      {workspace.name}
                    </div>
                    <div className="mt-1 text-sm text-white/55">{workspace.description ?? "No description yet."}</div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={workspace.id === viewer.activeWorkspace?.id ? "accent" : "default"}>
                      {workspace.id === viewer.activeWorkspace?.id ? "Active" : "Available"}
                    </Badge>
                    <Badge variant="warning">{workspace.role.toLowerCase()}</Badge>
                  </div>
                </div>
                <div className="mt-4 grid gap-3 text-sm text-white/60 sm:grid-cols-3">
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="data-label">Type</div>
                    <div className="mt-2 text-white">{workspace.type.toLowerCase()}</div>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="data-label">Members</div>
                    <div className="mt-2 text-white">{workspace.memberCount}</div>
                  </div>
                  <div className="rounded-[20px] border border-white/10 bg-white/[0.03] p-3">
                    <div className="data-label">Scans</div>
                    <div className="mt-2 text-white">{workspace.scanCount}</div>
                  </div>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>

        <CreateWorkspaceForm />
      </section>

      {activeWorkspace?.type === "TEAM" ? (
        <section className="mt-10">
          <div className="mb-6">
            <div className="section-kicker">Team management</div>
            <h2 className="mt-2 font-heading text-3xl text-white">{activeWorkspace.name}</h2>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-white/60">
              Invite collaborators, manage roles, and remove access without leaving the product.
            </p>
          </div>
          <WorkspaceTeamManager
            workspaceId={activeWorkspace.id}
            workspaceName={activeWorkspace.name}
            currentUserId={viewer.userId}
            currentRole={activeWorkspace.role}
            members={members}
            invites={invites}
            canInvite={activeRole ? canInviteToWorkspace(activeRole) : false}
            canManageMembers={activeRole ? canManageWorkspaceMembers(activeRole) : false}
          />
        </section>
      ) : null}

      <section className="mt-10 grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
        <Card>
          <CardHeader>
            <div className="section-kicker">Audit trail</div>
            <CardTitle className="mt-2">Recent workspace activity</CardTitle>
            <CardDescription>A lightweight operational trail for the currently active workspace.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {auditEvents.length > 0 ? (
              auditEvents.map((event) => (
                <div key={event.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div className="font-medium text-white">{actionLabels[event.action] ?? event.action}</div>
                    <div className="text-xs text-white/35">{formatDateTime(event.createdAt)}</div>
                  </div>
                  <div className="mt-2 text-sm text-white/60">{event.detail ?? event.target ?? "No detail recorded."}</div>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                No audit activity has been recorded for this workspace yet.
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="section-kicker">Your authored activity</div>
            <CardTitle className="mt-2">Recent scans across workspaces</CardTitle>
            <CardDescription>The live reviews you created, regardless of which workspace they landed in.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {scans.length > 0 ? (
              scans.map((scan) => (
                <div key={scan.id} className="flex items-center justify-between gap-4 rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div>
                    <div className="flex items-center gap-2 font-heading text-lg text-white">
                      <Users className="h-4 w-4 text-cyan-100" />
                      {scan.hostname}
                    </div>
                    <div className="mt-1 text-sm text-white/55">{scan.workspace?.name ?? "Personal activity"}</div>
                  </div>
                  <Button asChild variant="secondary" size="sm">
                    <Link href={`/scans/${scan.id}`}>
                      Open
                      <ArrowRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              ))
            ) : (
              <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/60">
                You have not created a live scan yet.
              </div>
            )}
            <div className="grid gap-3 pt-2 sm:grid-cols-2">
              <Button asChild className="w-full">
                <Link href="/">
                  <Activity className="h-4 w-4" />
                  Run a new scan
                </Link>
              </Button>
              <Button asChild className="w-full" variant="secondary">
                <Link href={"/ops" as Route}>
                  <Radar className="h-4 w-4" />
                  Open ops
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </section>
    </main>
  );
}