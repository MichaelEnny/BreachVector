import { ShieldOff } from "lucide-react";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function AuthDisabledCard() {
  return (
    <Card>
      <CardHeader>
        <div className="grid h-12 w-12 place-items-center rounded-[18px] border border-white/10 bg-black/20">
          <ShieldOff className="h-5 w-5 text-amber-100" />
        </div>
        <div className="section-kicker mt-3">Authentication</div>
        <CardTitle className="mt-1">Authentication is not configured</CardTitle>
        <CardDescription>
          Add Clerk keys to enable signed-in scans, owned history, invitations, and account pages.
        </CardDescription>
      </CardHeader>
      <CardContent className="text-sm leading-6 text-white/60">
        Set `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `CLERK_SECRET_KEY`, `NEXT_PUBLIC_CLERK_SIGN_IN_URL`, and `NEXT_PUBLIC_CLERK_SIGN_UP_URL`, then restart the app.
      </CardContent>
    </Card>
  );
}
