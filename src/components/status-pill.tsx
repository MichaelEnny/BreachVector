import { Badge } from "@/components/ui/badge";

export function StatusPill({ label, value, ok }: { label: string; value: string; ok: boolean }) {
  return (
    <div className="rounded-[24px] border border-white/10 bg-black/20 p-4">
      <div className="data-label">{label}</div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="text-sm leading-6 text-white/82">{value}</div>
        <Badge variant={ok ? "success" : "warning"}>{ok ? "Pass" : "Review"}</Badge>
      </div>
    </div>
  );
}
