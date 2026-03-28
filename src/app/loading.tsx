export default function Loading() {
  return (
    <main className="min-h-screen">
      <div className="container flex min-h-screen items-center justify-center py-24">
        <div className="w-full max-w-xl rounded-[32px] border border-white/10 bg-white/6 p-10 text-center shadow-lens backdrop-blur-xl">
          <div className="mx-auto mb-6 h-14 w-14 animate-pulse rounded-full border border-cyan-300/30 bg-cyan-300/10" />
          <div className="font-heading text-3xl text-white">Loading BreachVector</div>
          <p className="mt-3 text-sm text-white/55">
            Preparing the report canvas and latest scan state.
          </p>
        </div>
      </div>
    </main>
  );
}
