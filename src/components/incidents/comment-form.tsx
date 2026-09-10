"use client";

import { useState } from "react";

import { addComment } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function CommentForm({ incidentId }: { incidentId: string }) {
  const [body, setBody] = useState("");
  const { run, isPending } = useServerAction(addComment, {
    onSuccess: () => setBody(""),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        run({ incidentId, body });
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Afegeix un comentari de seguiment…"
        rows={3}
      />
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={isPending || !body.trim()}>
          {isPending ? "Enviant…" : "Comenta"}
        </Button>
      </div>
    </form>
  );
}
