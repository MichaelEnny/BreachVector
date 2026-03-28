"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { LoaderCircle, Plus } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateWorkspaceForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  return (
    <div className="panel p-5 md:p-6">
      <div className="section-kicker">Create workspace</div>
      <div className="mt-3 font-heading text-2xl text-white">Spin up a team workspace</div>
      <p className="mt-3 text-sm leading-6 text-white/60">
        Create a shared environment for agencies, internal security teams, or hackathon collaborators.
      </p>

      <form
        className="mt-5 space-y-3"
        onSubmit={(event) => {
          event.preventDefault();
          setError(null);
          setMessage(null);

          startTransition(async () => {
            try {
              const response = await fetch("/api/workspaces", {
                method: "POST",
                headers: {
                  "content-type": "application/json"
                },
                body: JSON.stringify({ name, description })
              });

              const payload = (await response.json()) as { error?: string; workspace?: { name: string } };

              if (!response.ok || !payload.workspace) {
                throw new Error(payload.error || "Workspace creation failed.");
              }

              setName("");
              setDescription("");
              setMessage(`${payload.workspace.name} is ready and now active.`);
              router.refresh();
            } catch (creationError) {
              setError(
                creationError instanceof Error ? creationError.message : "Workspace creation failed."
              );
            }
          });
        }}
      >
        <Input
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Workspace name"
          autoComplete="off"
        />
        <Input
          value={description}
          onChange={(event) => setDescription(event.target.value)}
          placeholder="Optional description"
          autoComplete="off"
        />
        <Button type="submit" className="w-full" disabled={isPending || name.trim().length < 3}>
          {isPending ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
          {isPending ? "Creating workspace" : "Create team workspace"}
        </Button>
      </form>

      {message ? (
        <div className="mt-4 rounded-[22px] border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm text-cyan-50">
          {message}
        </div>
      ) : null}
      {error ? (
        <div className="mt-4 rounded-[22px] border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-sm text-rose-100">
          {error}
        </div>
      ) : null}
    </div>
  );
}
