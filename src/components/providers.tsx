import { ClerkProvider } from "@clerk/nextjs";

import { hasClerkAuth } from "@/lib/env";

const signInUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_IN_URL || "/sign-in";
const signUpUrl = process.env.NEXT_PUBLIC_CLERK_SIGN_UP_URL || "/sign-up";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!hasClerkAuth()) {
    return <>{children}</>;
  }

  return (
    <ClerkProvider signInUrl={signInUrl} signUpUrl={signUpUrl}>
      {children}
    </ClerkProvider>
  );
}
