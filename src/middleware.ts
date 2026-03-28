import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

import { hasClerkAuth } from "@/lib/env";

const isProtectedRoute = createRouteMatcher([
  "/history(.*)",
  "/account(.*)",
  "/jobs(.*)",
  "/api/analyze(.*)",
  "/api/jobs(.*)",
  "/api/workspaces(.*)"
]);

const clerkHandler = clerkMiddleware(async (auth, request) => {
  if (isProtectedRoute(request)) {
    await auth.protect();
  }
});

export default function middleware(
  request: Parameters<typeof clerkHandler>[0],
  event: Parameters<typeof clerkHandler>[1]
) {
  if (!hasClerkAuth()) {
    return NextResponse.next();
  }

  return clerkHandler(request, event);
}

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)"
  ]
};