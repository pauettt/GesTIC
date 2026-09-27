"use client";

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";

import { setKeyArchived } from "@/actions/keys";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

/**
 * Arxiva una clau o la recupera. No demana confirmació: no es perd res i es
 * desfà amb un clic des de «Claus arxivades».
 */
export function ArchiveKeyButton({
  keyId,
  number,
  archived,
}: {
  keyId: string;
  number: string;
  archived: boolean;
}) {
  const { run, isPending } = useServerAction(setKeyArchived, {
    successMessage: archived ? `Clau ${number} recuperada` : `Clau ${number} arxivada`,
  });

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={isPending}
      onClick={() => run({ id: keyId, archived: !archived })}
    >
      {archived ? <ArchiveRestoreIcon className="size-4" /> : <ArchiveIcon className="size-4" />}
      {archived ? "Recupera" : "Arxiva"}
    </Button>
  );
}
