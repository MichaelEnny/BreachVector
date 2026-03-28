"use client";

import Link from "next/link";
import type { Route } from "next";
import { UserButton } from "@clerk/nextjs";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export function AuthControls({
  authEnabled,
  signedIn
}: {
  authEnabled: boolean;
  signedIn: boolean;
}) {
  if (!authEnabled) {
    return <Badge variant="warning">Auth setup required</Badge>;
  }

  if (!signedIn) {
    return (
      <div className="flex flex-wrap items-center gap-2">
        <Button asChild variant="secondary" size="sm">
          <Link href={"/sign-in" as Route}>Sign in</Link>
        </Button>
        <Button asChild size="sm">
          <Link href={"/sign-up" as Route}>Create account</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2">
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href={"/history" as Route}>History</Link>
      </Button>
      <Button asChild variant="ghost" size="sm" className="hidden md:inline-flex">
        <Link href={"/account" as Route}>Account</Link>
      </Button>
      <div className="rounded-full border border-white/12 bg-black/20 p-1">
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-9 w-9 ring-1 ring-white/10"
            }
          }}
        />
      </div>
    </div>
  );
}