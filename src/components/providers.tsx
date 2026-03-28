import { ClerkProvider } from "@clerk/nextjs";

import { hasClerkAuth } from "@/lib/env";

export function Providers({ children }: { children: React.ReactNode }) {
  if (!hasClerkAuth()) {
    return <>{children}</>;
  }

  return <ClerkProvider>{children}</ClerkProvider>;
}
