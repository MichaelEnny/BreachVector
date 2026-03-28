"use client";

import { useState, useTransition } from "react";
import { Copy, ExternalLink, FileDown, Link2, Printer, ShieldX } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { ShareAccess, ShareLinkRecord } from "@/lib/types";

function buildShareUrl(token: string) {
  if (typeof window === "undefined") {
    return `/share/${token}`;
  }

  return `${window.location.origin}/share/${token}`;
}

export function ReportActions({
  scanId,
  initialShareLink,
  exportCount,
  canManageShare
}: {
  scanId: string;
  initialShareLink?: ShareLinkRecord | null;
  exportCount?: number;
  canManageShare: boolean;
}) {
  const [shareLink, setShareLink] = useState<ShareLinkRecord | null>(initialShareLink ?? null);
  const [shareAccess, setShareAccess] = useState<ShareAccess>(initialShareLink?.access ?? "PUBLIC");
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const shareUrl = shareLink ? buildShareUrl(shareLink.token) : null;

  async function handleCreateOrUpdateShare() {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch(`/api/scans/${scanId}/share`, {
          method: "POST",
          headers: {
            "content-type": "application/json"
          },
          body: JSON.stringify({ access: shareAccess })
        });

        const payload = (await response.json()) as {
          error?: string;
          share?: ShareLinkRecord;
        };

        if (!response.ok || !payload.share) {
          throw new Error(payload.error || "The share link could not be created.");
        }

        setShareLink(payload.share);
        setMessage(`Read-only ${payload.share.access.toLowerCase()} share link is ready.`);
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "The share link could not be created.");
      }
    });
  }

  async function handleRevokeShare() {
    startTransition(async () => {
      setMessage(null);

      try {
        const response = await fetch(`/api/scans/${scanId}/share`, {
          method: "DELETE"
        });

        const payload = (await response.json()) as { error?: string };

        if (!response.ok) {
          throw new Error(payload.error || "The share link could not be revoked.");
        }

        setShareLink(null);
        setMessage("Share link revoked.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "The share link could not be revoked.");
      }
    });
  }

  async function handleCopyShare() {
    if (!shareUrl) {
      return;
    }

    await navigator.clipboard.writeText(shareUrl);
    setMessage("Share link copied to clipboard.");
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <div className="section-kicker">Distribution</div>
        <CardTitle className="mt-2">Report actions</CardTitle>
        <CardDescription>
          Open a print-ready layout, export a deliverable PDF, or generate a read-only share link.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="intel-card border-cyan-300/10 bg-cyan-300/[0.07]">
          <div className="data-label">Delivery stack</div>
          <div className="mt-2 font-heading text-xl text-white">Built for handoff, not just inspection</div>
          <p className="mt-2 text-sm leading-6 text-white/62">
            This report can move from live product view to boardroom PDF or read-only share link without changing context.
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <Button asChild variant="secondary">
            <a href={`/scans/${scanId}/print`} target="_blank" rel="noreferrer">
              <Printer className="h-4 w-4" />
              Print view
            </a>
          </Button>
          <Button asChild>
            <a href={`/api/scans/${scanId}/pdf`} target="_blank" rel="noreferrer">
              <FileDown className="h-4 w-4" />
              Export PDF
            </a>
          </Button>
        </div>

        <div className="intel-card">
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="data-label">Export tracking</div>
              <div className="mt-2 text-sm text-white/62">Recorded PDF downloads for this report.</div>
            </div>
            <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm text-white">
              {exportCount ?? 0}
            </div>
          </div>
        </div>

        {canManageShare ? (
          <div className="intel-card">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <div className="data-label">Read-only sharing</div>
                <div className="mt-2 font-heading text-lg text-white">Share outside the workspace</div>
                <div className="mt-1 text-sm text-white/58">
                  Public links open to anyone with the token. Private links require sign-in.
                </div>
              </div>
              <div className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-sm text-white">
                {shareLink?.accessCount ?? 0} opens
              </div>
            </div>

            <div className="grid gap-3 md:grid-cols-[1fr_auto]">
              <select
                value={shareAccess}
                onChange={(event) => setShareAccess(event.target.value as ShareAccess)}
                className="h-11 rounded-[18px] border border-white/12 bg-white/6 px-4 text-sm text-white outline-none"
              >
                <option value="PUBLIC">Public share link</option>
                <option value="PRIVATE">Private share link</option>
              </select>
              <Button type="button" onClick={handleCreateOrUpdateShare} disabled={isPending}>
                <Link2 className="h-4 w-4" />
                {shareLink ? "Update link" : "Create link"}
              </Button>
            </div>

            {shareUrl ? (
              <div className="mt-3 rounded-[22px] border border-cyan-300/15 bg-cyan-300/8 p-3 text-sm break-all text-cyan-50">
                {shareUrl}
              </div>
            ) : null}

            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <Button type="button" variant="secondary" onClick={handleCopyShare} disabled={!shareUrl}>
                <Copy className="h-4 w-4" />
                Copy link
              </Button>
              <Button type="button" variant="ghost" onClick={handleRevokeShare} disabled={!shareLink || isPending}>
                <ShieldX className="h-4 w-4" />
                Revoke link
              </Button>
            </div>

            {shareUrl ? (
              <Button asChild variant="ghost" className="mt-3 w-full">
                <a href={shareUrl} target="_blank" rel="noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open shared view
                </a>
              </Button>
            ) : null}
          </div>
        ) : null}

        {message ? (
          <div className="rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
            {message}
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
