import { SignIn } from "@clerk/nextjs";

import { AuthDisabledCard } from "@/components/auth-disabled-card";
import { hasClerkAuth } from "@/lib/env";

export default function SignInPage() {
  return (
    <main className="container py-16">
      <div className="mx-auto max-w-md">
        {hasClerkAuth() ? (
          <SignIn
            routing="path"
            path="/sign-in"
            signUpUrl="/sign-up"
            fallbackRedirectUrl="/"
          />
        ) : (
          <AuthDisabledCard />
        )}
      </div>
    </main>
  );
}
