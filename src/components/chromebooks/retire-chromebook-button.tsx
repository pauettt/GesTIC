"use client";

import { ArchiveIcon, ArchiveRestoreIcon } from "lucide-react";

import { setChromebookRetired } from "@/actions/chromebooks";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";

/**
 * Dona de baixa un Chromebook o el torna a activar. No demana confirmació: es
 * desfà amb el mateix botó i no es perd res, a diferència d'esborrar-lo.
 */
export function RetireChromebookButton({
  chromebookId,
  retired,
}: {
  chromebookId: string;
  retired: boolean;
}) {
  const { run, isPending } = useServerAction(setChromebookRetired, {
    successMessage: retired ? "Dispositiu reactivat" : "Dispositiu donat de baixa",
  });

  return (
    <Button
      type="button"
      variant="outline"
      size="xs"
      disabled={isPending}
      onClick={() => run({ id: chromebookId, retired: !retired })}
    >
      {retired ? <ArchiveRestoreIcon className="size-3.5" /> : <ArchiveIcon className="size-3.5" />}
      {retired ? "Torna a activar" : "Dona de baixa"}
    </Button>
  );
}
