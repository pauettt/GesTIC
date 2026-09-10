"use client";

import { useState } from "react";

import { addQueryComment } from "@/actions/queries";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export function QueryCommentForm({ queryId }: { queryId: string }) {
  const [body, setBody] = useState("");
  const { run, isPending } = useServerAction(addQueryComment, {
    onSuccess: () => setBody(""),
  });

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        if (!body.trim()) return;
        run({ queryId, body });
      }}
      className="flex flex-col gap-2"
    >
      <Textarea
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Escriu una resposta o afegeix més detall…"
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
