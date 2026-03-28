import { auth, currentUser } from "@clerk/nextjs/server";

import { resolveViewerWorkspaces } from "@/lib/data/workspaces";
import { hasClerkAuth } from "@/lib/env";
import type { WorkspaceSummary } from "@/lib/types";

export interface ViewerContext {
  authEnabled: boolean;
  userId: string | null;
  firstName: string | null;
  lastName: string | null;
  emailAddress: string | null;
  workspaces: WorkspaceSummary[];
  activeWorkspace: WorkspaceSummary | null;
}

export function getSignInUrl(returnTo = "/") {
  const encoded = encodeURIComponent(returnTo);
  return `/sign-in?redirect_url=${encoded}`;
}

export async function getViewerContext(): Promise<ViewerContext> {
  if (!hasClerkAuth()) {
    return {
      authEnabled: false,
      userId: null,
      firstName: null,
      lastName: null,
      emailAddress: null,
      workspaces: [],
      activeWorkspace: null
    };
  }

  const session = await auth();

  if (!session.userId) {
    return {
      authEnabled: true,
      userId: null,
      firstName: null,
      lastName: null,
      emailAddress: null,
      workspaces: [],
      activeWorkspace: null
    };
  }

  const user = await currentUser();
  const primaryEmail =
    user?.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress ??
    user?.emailAddresses[0]?.emailAddress ??
    null;

  const workspaceState = await resolveViewerWorkspaces({
    userId: session.userId,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    emailAddress: primaryEmail
  });

  return {
    authEnabled: true,
    userId: session.userId,
    firstName: user?.firstName ?? null,
    lastName: user?.lastName ?? null,
    emailAddress: primaryEmail,
    workspaces: workspaceState.workspaces,
    activeWorkspace: workspaceState.activeWorkspace
  };
}