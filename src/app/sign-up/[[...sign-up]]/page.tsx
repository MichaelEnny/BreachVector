import { SignUp } from "@clerk/nextjs";

import { AuthDisabledCard } from "@/components/auth-disabled-card";
import { hasClerkAuth } from "@/lib/env";

export default function SignUpPage() {
  return (
    <main className="container py-16">
      <div className="mx-auto max-w-md">
        {hasClerkAuth() ? (
          <SignUp
            routing="path"
            path="/sign-up"
            signInUrl="/sign-in"
            fallbackRedirectUrl="/"
          />
        ) : (
          <AuthDisabledCard />
        )}
      </div>
    </main>
  );
}
