"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronsUpDown, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { WorkspaceSummary } from "@/lib/types";

export function WorkspaceSwitcher({
  workspaces,
  activeWorkspaceId
}: {
  workspaces: WorkspaceSummary[];
  activeWorkspaceId: string | null;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState(activeWorkspaceId ?? workspaces[0]?.id ?? "");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  if (workspaces.length === 0) {
    return null;
  }

  return (
    <div className="flex items-center gap-2">
      <div className="relative min-w-[210px]">
        <select
          value={selected}
          disabled={isPending}
          onChange={(event) => {
            const workspaceId = event.target.value;
            setSelected(workspaceId);
            setError(null);

            startTransition(async () => {
              try {
                const response = await fetch("/api/workspaces/select", {
                  method: "POST",
                  headers: {
                    "content-type": "application/json"
                  },
                  body: JSON.stringify({ workspaceId })
                });

                const payload = (await response.json()) as { error?: string };

                if (!response.ok) {
                  throw new Error(payload.error || "Workspace selection failed.");
                }

                router.refresh();
              } catch (selectionError) {
                setError(
                  selectionError instanceof Error ? selectionError.message : "Workspace selection failed."
                );
              }
            });
          }}
          className="h-11 w-full appearance-none rounded-[18px] border border-white/12 bg-black/25 px-4 pr-10 text-sm text-white outline-none transition focus:border-cyan-300/50"
        >
          {workspaces.map((workspace) => (
            <option key={workspace.id} value={workspace.id}>
              {workspace.name} ({workspace.role.toLowerCase()})
            </option>
          ))}
        </select>
        <ChevronsUpDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/45" />
      </div>
      <Button type="button" variant="secondary" size="sm" disabled className="hidden sm:inline-flex">
        {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : workspaces.length}
        Spaces
      </Button>
      {error ? <div className="hidden text-xs text-rose-200 xl:block">{error}</div> : null}
    </div>
  );
}
