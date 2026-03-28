import Link from "next/link";
import { ArrowRight, Clock3, Radar, Users } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/score-ring";
import type { StoredScan } from "@/lib/types";
import { formatDateTime } from "@/lib/utils";

function badgeForScore(score: number) {
  if (score >= 80) {
    return "success" as const;
  }

  if (score >= 60) {
    return "warning" as const;
  }

  return "danger" as const;
}

export function HistoryList({ scans }: { scans: StoredScan[] }) {
  if (scans.length === 0) {
    return (
      <Card className="panel-muted bg-white/[0.04]">
        <CardContent className="p-8 text-center">
          <div className="section-kicker">No scans yet</div>
          <div className="mt-3 font-heading text-3xl text-white">The history rail is waiting for its first report.</div>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-white/58">
            Queue a passive review or open a seeded showcase report to make the product feel alive.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {scans.map((scan) => (
        <Link key={scan.id} href={`/scans/${scan.id}`} className="group block">
          <Card className="h-full overflow-hidden transition duration-200 hover:-translate-y-1 hover:border-cyan-300/20 hover:bg-white/[0.08]">
            <CardContent className="flex h-full flex-col gap-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-[0.26em] text-white/40">
                    <span>{scan.origin === "DEMO" ? "Showcase sample" : "Live review"}</span>
                    {scan.workspace ? (
                      <span className="inline-flex items-center gap-1 text-cyan-100/80">
                        <Users className="h-3.5 w-3.5" />
                        {scan.workspace.name}
                      </span>
                    ) : null}
                  </div>
                  <div className="mt-3 truncate font-heading text-2xl text-white">{scan.hostname}</div>
                  <p className="mt-3 line-clamp-3 text-sm leading-6 text-white/60">{scan.executiveSummary}</p>
                </div>
                <ScoreRing score={scan.overallScore} size="sm" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="data-label">Score band</div>
                  <div className="mt-2">
                    <Badge variant={badgeForScore(scan.overallScore)}>{scan.overallScore}/100 posture</Badge>
                  </div>
                </div>
                <div className="rounded-[22px] border border-white/10 bg-black/20 p-4">
                  <div className="data-label">Completed</div>
                  <div className="mt-2 flex items-center gap-2 text-sm text-white/65">
                    <Clock3 className="h-4 w-4 text-cyan-100" />
                    {formatDateTime(scan.createdAt)}
                  </div>
                </div>
              </div>

              <div className="mt-auto flex items-center justify-between border-t border-white/10 pt-4 text-sm text-white/55">
                <div className="inline-flex items-center gap-2">
                  <Radar className="h-4 w-4 text-cyan-100" />
                  Ready for dashboard, print, and export views
                </div>
                <span className="inline-flex items-center gap-1 text-cyan-100 transition group-hover:translate-x-0.5">
                  Open report
                  <ArrowRight className="h-4 w-4" />
                </span>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
