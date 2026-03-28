"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, ShieldCheck, Users } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { WorkspaceInviteRecord, WorkspaceSummary } from "@/lib/types";

export function AcceptInviteCard({
  invite,
  workspace,
  signedIn,
  signInUrl,
  emailMismatch
}: {
  invite: WorkspaceInviteRecord;
  workspace: WorkspaceSummary | { name: string; description: string | null; type: string };
  signedIn: boolean;
  signInUrl: string;
  emailMismatch: boolean;
}) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const active = invite.status === "PENDING";

  return (
    <Card className="mx-auto max-w-2xl overflow-hidden">
      <CardHeader>
        <div className="section-kicker">Workspace invitation</div>
        <CardTitle className="mt-2">Join {workspace.name}</CardTitle>
        <CardDescription>
          Accept this invite to join the workspace and collaborate on scans, reports, exports, and team history.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="rounded-[24px] border border-white/10 bg-black/20 p-4 text-sm text-white/60">
          <div className="flex items-center gap-2 text-white">
            <Users className="h-4 w-4 text-cyan-100" />
            Workspace details
          </div>
          <div className="mt-3">Role on join: {invite.role.toLowerCase()}</div>
          <div className="mt-1">Invite email: {invite.emailAddress}</div>
          <div className="mt-1">Expires: {new Date(invite.expiresAt).toLocaleString()}</div>
        </div>

        {!signedIn ? (
          <Button asChild className="w-full">
            <a href={signInUrl}>Sign in to accept invite</a>
          </Button>
        ) : !active ? (
          <div className="rounded-[22px] border border-amber-400/20 bg-amber-400/10 px-4 py-3 text-sm text-amber-50">
            This invite is {invite.status.toLowerCase()} and can no longer be used.
          </div>
        ) : emailMismatch ? (
          <div className="rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
            Sign in with {invite.emailAddress} to accept this workspace invite.
          </div>
        ) : (
          <Button
            type="button"
            className="w-full"
            disabled={isPending}
            onClick={() => {
              setError(null);
              setMessage(null);
              startTransition(async () => {
                try {
                  const response = await fetch(`/api/workspaces/invites/${invite.token}/accept`, {
                    method: "POST"
                  });
                  const payload = (await response.json()) as { error?: string };

                  if (!response.ok) {
                    throw new Error(payload.error || "Invite acceptance failed.");
                  }

                  setMessage(`Joined ${workspace.name}. Redirecting to your account.`);
                  router.push("/account");
                  router.refresh();
                } catch (acceptError) {
                  setError(acceptError instanceof Error ? acceptError.message : "Invite acceptance failed.");
                }
              });
            }}
          >
            {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <ShieldCheck className="h-4 w-4" />}
            Accept invite
          </Button>
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
      </CardContent>
    </Card>
  );
}
