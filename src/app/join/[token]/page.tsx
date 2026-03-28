import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AcceptInviteCard } from "@/components/accept-invite-card";
import { getSignInUrl, getViewerContext } from "@/lib/auth";
import { getWorkspaceInviteByToken } from "@/lib/data/workspaces";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: "Join Workspace | BreachVector"
  };
}

export default async function JoinWorkspacePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const inviteWithWorkspace = await getWorkspaceInviteByToken(token);

  if (!inviteWithWorkspace) {
    notFound();
  }

  const viewer = await getViewerContext();
  const emailMismatch = Boolean(
    viewer.userId && viewer.emailAddress && viewer.emailAddress.toLowerCase() !== inviteWithWorkspace.invite.emailAddress.toLowerCase()
  );

  return (
    <main className="relative overflow-hidden pb-20 pt-12">
      <div className="absolute inset-0 surface-grid opacity-20" />
      <div className="absolute left-1/2 top-[-15%] h-[32rem] w-[32rem] -translate-x-1/2 rounded-full bg-cyan-300/10 blur-3xl" />
      <section className="container relative z-10">
        <AcceptInviteCard
          invite={inviteWithWorkspace.invite}
          workspace={inviteWithWorkspace.organization}
          signedIn={Boolean(viewer.userId)}
          signInUrl={getSignInUrl(`/join/${token}`)}
          emailMismatch={emailMismatch}
        />
      </section>
    </main>
  );
}