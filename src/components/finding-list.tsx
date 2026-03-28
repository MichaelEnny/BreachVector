import { ShieldAlert, ShieldCheck, TriangleAlert } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { FindingRecord } from "@/lib/types";

function findingTone(severity: FindingRecord["severity"]) {
  if (severity === "CRITICAL" || severity === "HIGH") {
    return {
      badge: "danger" as const,
      icon: ShieldAlert,
      iconTint: "text-rose-100"
    };
  }

  if (severity === "MEDIUM" || severity === "LOW") {
    return {
      badge: "warning" as const,
      icon: TriangleAlert,
      iconTint: "text-amber-100"
    };
  }

  return {
    badge: "success" as const,
    icon: ShieldCheck,
    iconTint: "text-emerald-100"
  };
}

export function FindingList({ findings }: { findings: FindingRecord[] }) {
  return (
    <div className="grid gap-4">
      {findings.map((finding, index) => {
        const tone = findingTone(finding.severity);
        const Icon = tone.icon;

        return (
          <Card key={`${finding.title}-${finding.displayOrder}`} className="overflow-hidden bg-white/[0.045]">
            <CardContent className="p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="flex min-w-0 items-start gap-4">
                  <div className="grid h-12 w-12 shrink-0 place-items-center rounded-[18px] border border-white/10 bg-black/20">
                    <Icon className={`h-5 w-5 ${tone.iconTint}`} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.22em] text-white/40">
                      <span>{finding.category}</span>
                      <span>#{index + 1}</span>
                    </div>
                    <h3 className="mt-2 text-balance font-heading text-xl text-white">{finding.title}</h3>
                    <p className="mt-3 text-sm leading-6 text-white/65">{finding.summary}</p>
                  </div>
                </div>
                <Badge variant={tone.badge}>{finding.severity}</Badge>
              </div>
              {finding.evidence ? (
                <div className="mt-4 rounded-[22px] border border-white/10 bg-black/20 px-4 py-3 text-sm text-white/58">
                  <span className="font-medium text-white/78">Observed:</span> {finding.evidence}
                </div>
              ) : null}
              <div className="mt-4 rounded-[22px] border border-cyan-300/10 bg-cyan-300/5 px-4 py-3 text-sm leading-6 text-cyan-50/90">
                <span className="font-medium text-white">Remediation:</span> {finding.recommendation}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
