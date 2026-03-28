import { cn } from "@/lib/utils";

function getScoreTone(score: number) {
  if (score >= 80) {
    return {
      ring: "from-emerald-300 via-cyan-300 to-teal-400",
      text: "text-emerald-100",
      chip: "Healthy posture"
    };
  }

  if (score >= 60) {
    return {
      ring: "from-amber-200 via-orange-300 to-amber-500",
      text: "text-amber-100",
      chip: "Needs hardening"
    };
  }

  return {
    ring: "from-rose-200 via-orange-300 to-rose-500",
    text: "text-rose-100",
    chip: "Immediate gaps"
  };
}

export function ScoreRing({ score, size = "lg" }: { score: number; size?: "lg" | "sm" }) {
  const tone = getScoreTone(score);
  const dimension = size === "lg" ? "h-44 w-44" : "h-24 w-24";
  const inner = size === "lg" ? "h-32 w-32 text-5xl" : "h-16 w-16 text-xl";

  return (
    <div
      className={cn(
        "relative grid place-items-center rounded-full border border-white/10 bg-black/20 shadow-glow",
        dimension
      )}
      style={{
        backgroundImage: `conic-gradient(from 205deg, rgba(255,255,255,0.06) 0deg ${
          360 - score * 3.6
        }deg, rgba(0,0,0,0) ${360 - score * 3.6}deg 360deg), radial-gradient(circle at center, rgba(125,211,252,0.18), rgba(8,15,24,0.92) 62%)`
      }}
    >
      <div
        className={cn(
          "grid place-items-center rounded-full border border-white/10 bg-slate-950/88 font-heading font-semibold",
          inner,
          tone.text
        )}
      >
        {score}
      </div>
      {size === "lg" ? (
        <div className="absolute -bottom-4 rounded-full border border-white/10 bg-slate-950/90 px-4 py-1.5 text-[10px] uppercase tracking-[0.28em] text-white/72">
          {tone.chip}
        </div>
      ) : null}
    </div>
  );
}
