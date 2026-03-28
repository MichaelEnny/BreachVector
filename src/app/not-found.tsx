import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-screen">
      <div className="container flex min-h-screen items-center justify-center py-24">
        <div className="max-w-xl rounded-[32px] border border-white/10 bg-white/6 p-10 shadow-lens backdrop-blur-xl">
          <div className="mb-4 text-xs uppercase tracking-[0.32em] text-cyan-200/70">BreachVector</div>
          <h1 className="font-heading text-4xl text-white">Scan not found</h1>
          <p className="mt-4 text-white/65">
            This report is not available in the current environment. If you are running in demo
            mode, try one of the seeded showcase scans from the homepage.
          </p>
          <Button asChild className="mt-8">
            <Link href="/">Back to home</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
