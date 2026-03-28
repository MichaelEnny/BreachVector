"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Copy, LoaderCircle, MailPlus, RotateCcw, ShieldAlert, Trash2, UserRoundPlus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { MembershipRecord, WorkspaceInviteRecord, WorkspaceRole } from "@/lib/types";

function buildInviteUrl(token: string) {
  if (typeof window === "undefined") {
    return `/join/${token}`;
  }

  return `${window.location.origin}/join/${token}`;
}

const roleOptions: WorkspaceRole[] = ["OWNER", "ADMIN", "MEMBER", "VIEWER"];

export function WorkspaceTeamManager({
  workspaceId,
  workspaceName,
  currentUserId,
  currentRole,
  members,
  invites,
  canInvite,
  canManageMembers
}: {
  workspaceId: string;
  workspaceName: string;
  currentUserId: string;
  currentRole: WorkspaceRole;
  members: MembershipRecord[];
  invites: WorkspaceInviteRecord[];
  canInvite: boolean;
  canManageMembers: boolean;
}) {
  const router = useRouter();
  const [emailAddress, setEmailAddress] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [inviteRole, setInviteRole] = useState<WorkspaceRole>(currentRole === "OWNER" ? "MEMBER" : "VIEWER");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const visibleInviteRoles = currentRole === "OWNER" ? roleOptions : roleOptions.filter((role) => role !== "OWNER");

  function withAction(action: () => Promise<void>) {
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (actionError) {
        setError(actionError instanceof Error ? actionError.message : "Workspace action failed.");
      }
    });
  }

  function confirmAction(messageText: string) {
    return typeof window === "undefined" ? true : window.confirm(messageText);
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[0.95fr_1.05fr]">
      <Card>
        <CardHeader>
          <div className="section-kicker">Invite teammates</div>
          <CardTitle className="mt-2">Create a join path into {workspaceName}</CardTitle>
          <CardDescription>Create email-bound invite links and assign the starting workspace role.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {canInvite ? (
            <form
              className="space-y-3"
              onSubmit={(event) => {
                event.preventDefault();
                withAction(async () => {
                  const response = await fetch(`/api/workspaces/${workspaceId}/invites`, {
                    method: "POST",
                    headers: {
                      "content-type": "application/json"
                    },
                    body: JSON.stringify({
                      emailAddress,
                      displayName,
                      role: inviteRole
                    })
                  });

                  const payload = (await response.json()) as {
                    error?: string;
                    invite?: WorkspaceInviteRecord;
                    url?: string;
                  };

                  if (!response.ok || !payload.invite) {
                    throw new Error(payload.error || "Invite creation failed.");
                  }

                  setEmailAddress("");
                  setDisplayName("");
                  setMessage(payload.url ? `Invite ready: ${payload.url}` : "Invite created.");
                });
              }}
            >
              <Input
                value={emailAddress}
                onChange={(event) => setEmailAddress(event.target.value)}
                placeholder="teammate@example.com"
                type="email"
                autoComplete="off"
              />
              <Input
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                placeholder="Optional teammate name"
                autoComplete="off"
              />
              <div className="grid gap-3 md:grid-cols-[1fr_auto]">
                <select
                  value={inviteRole}
                  onChange={(event) => setInviteRole(event.target.value as WorkspaceRole)}
                  className="h-14 rounded-[22px] border border-white/12 bg-black/20 px-4 text-base text-white outline-none"
                >
                  {visibleInviteRoles.map((role) => (
                    <option key={role} value={role}>
                      {role.toLowerCase()}
                    </option>
                  ))}
                </select>
                <Button type="submit" disabled={isPending || !emailAddress.trim()}>
                  {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <MailPlus className="h-4 w-4" />}
                  Create invite
                </Button>
              </div>
            </form>
          ) : (
            <div className="rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              Your current role is view-only for invite management in this workspace.
            </div>
          )}

          {message ? (
            <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
              {message}
            </div>
          ) : null}
          {error ? (
            <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          <div className="rounded-[22px] border border-cyan-300/10 bg-cyan-300/6 p-4 text-sm text-white/60">
            Invite links last 7 days, can be refreshed if they go stale, and only work for the email address you specify.
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="section-kicker">Pending invites</div>
          <CardTitle className="mt-2">Monitor acceptance</CardTitle>
          <CardDescription>Copy links, refresh expirations, or revoke unused invites.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {invites.length > 0 ? (
            invites.map((invite) => {
              const inviteUrl = buildInviteUrl(invite.token);
              return (
                <div key={invite.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <div className="font-medium text-white">{invite.displayName ?? invite.emailAddress}</div>
                      <div className="mt-1 text-sm text-white/55">{invite.emailAddress}</div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs text-white/45">
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{invite.role.toLowerCase()}</span>
                      <span className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1">{invite.status.toLowerCase()}</span>
                    </div>
                  </div>
                  <div className="mt-3 rounded-[22px] border border-white/10 bg-white/[0.03] p-3 text-xs break-all text-cyan-100">
                    {inviteUrl}
                  </div>
                  <div className="mt-3 text-xs text-white/40">Expires {new Date(invite.expiresAt).toLocaleString()}</div>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => {
                        void navigator.clipboard.writeText(inviteUrl);
                        setMessage(`Invite link copied for ${invite.emailAddress}.`);
                      }}
                    >
                      <Copy className="h-4 w-4" />
                      Copy link
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={!canInvite || isPending || invite.status !== "PENDING"}
                      onClick={() => {
                        withAction(async () => {
                          const response = await fetch(`/api/workspaces/${workspaceId}/invites/${invite.id}`, {
                            method: "PATCH"
                          });
                          const payload = (await response.json()) as { error?: string; url?: string };

                          if (!response.ok) {
                            throw new Error(payload.error || "Invite refresh failed.");
                          }

                          setMessage(payload.url ? `Invite refreshed: ${payload.url}` : `Invite refreshed for ${invite.emailAddress}.`);
                        });
                      }}
                    >
                      <RotateCcw className="h-4 w-4" />
                      Refresh
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!canInvite || isPending || invite.status !== "PENDING"}
                      onClick={() => {
                        if (!confirmAction(`Revoke the invite for ${invite.emailAddress}?`)) {
                          return;
                        }

                        withAction(async () => {
                          const response = await fetch(`/api/workspaces/${workspaceId}/invites/${invite.id}`, {
                            method: "DELETE"
                          });
                          const payload = (await response.json()) as { error?: string };

                          if (!response.ok) {
                            throw new Error(payload.error || "Invite revoke failed.");
                          }

                          setMessage(`Invite revoked for ${invite.emailAddress}.`);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Revoke
                    </Button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/60">
              No pending invites for {workspaceName} yet.
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="lg:col-span-2">
        <CardHeader>
          <div className="section-kicker">Workspace members</div>
          <CardTitle className="mt-2">Role-aware teammate management</CardTitle>
          <CardDescription>Review members, adjust roles deliberately, and remove access with safeguards.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {members.map((member) => {
            const isCurrentUser = member.userId === currentUserId;
            return (
              <div key={member.id} className="rounded-[24px] border border-white/10 bg-black/20 p-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 font-medium text-white">
                      <UserRoundPlus className="h-4 w-4 text-cyan-100" />
                      {member.displayName ?? member.emailAddress ?? member.userId}
                      {isCurrentUser ? <span className="text-xs text-cyan-100">You</span> : null}
                    </div>
                    <div className="mt-1 text-sm text-white/55">{member.emailAddress ?? member.userId}</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,200px)_auto]">
                    <select
                      value={member.role}
                      disabled={!canManageMembers || isCurrentUser || isPending}
                      onChange={(event) => {
                        const role = event.target.value as WorkspaceRole;

                        if (
                          role === member.role ||
                          !confirmAction(
                            role === "OWNER"
                              ? `Promote ${member.emailAddress ?? member.userId} to owner? They will be able to manage all members and invites.`
                              : `Change ${member.emailAddress ?? member.userId} to ${role.toLowerCase()}?`
                          )
                        ) {
                          return;
                        }

                        withAction(async () => {
                          const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
                            method: "PATCH",
                            headers: {
                              "content-type": "application/json"
                            },
                            body: JSON.stringify({ role })
                          });
                          const payload = (await response.json()) as { error?: string };

                          if (!response.ok) {
                            throw new Error(payload.error || "Role update failed.");
                          }

                          setMessage(`Updated ${member.emailAddress ?? member.userId} to ${role.toLowerCase()}.`);
                        });
                      }}
                      className="h-11 rounded-[18px] border border-white/12 bg-white/6 px-4 text-sm text-white outline-none"
                    >
                      {roleOptions.map((role) => (
                        <option key={role} value={role}>
                          {role.toLowerCase()}
                        </option>
                      ))}
                    </select>
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={!canManageMembers || isCurrentUser || isPending}
                      onClick={() => {
                        if (
                          !confirmAction(
                            `Remove ${member.emailAddress ?? member.userId} from ${workspaceName}? They will immediately lose access to workspace scans and reports.`
                          )
                        ) {
                          return;
                        }

                        withAction(async () => {
                          const response = await fetch(`/api/workspaces/${workspaceId}/members/${member.id}`, {
                            method: "DELETE"
                          });
                          const payload = (await response.json()) as { error?: string };

                          if (!response.ok) {
                            throw new Error(payload.error || "Member removal failed.");
                          }

                          setMessage(`Removed ${member.emailAddress ?? member.userId} from ${workspaceName}.`);
                        });
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                      Remove
                    </Button>
                  </div>
                </div>
                {member.role === "OWNER" ? (
                  <div className="mt-3 inline-flex items-center gap-2 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs text-amber-100">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    Owner access includes invite and member management.
                  </div>
                ) : null}
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
