"use client";

import { useState } from "react";
import { CheckIcon, MailIcon } from "lucide-react";

import { remindKeyReturn, returnKey } from "@/actions/keys";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

type Option = { id: string; name: string };

export function ReturnKeyButton({ loanId }: { loanId: string }) {
  const { run, isPending } = useServerAction(returnKey, { successMessage: "Clau tornada" });

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => run({ loanId })}>
      <CheckIcon className="size-4" />
      Tornada
    </Button>
  );
}

/**
 * Avís a qui no ha tornat la clau. Demana quin conserge l'envia perquè després
 * la fila ho mostri: amb tres persones al taulell, sense aquesta constància el
 * mateix professor rebria tres correus seguits.
 */
export function RemindKeyButton({
  loanId,
  concierges,
  borrowerName,
}: {
  loanId: string;
  concierges: Option[];
  borrowerName: string;
}) {
  const [open, setOpen] = useState(false);
  const { run, isPending } = useServerAction(remindKeyReturn, {
    successMessage: `Avís enviat a ${borrowerName}`,
    onSuccess: () => setOpen(false),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button size="sm" variant="outline">
            <MailIcon className="size-4" />
            Avisa
          </Button>
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avisar {borrowerName}</DialogTitle>
        </DialogHeader>
        <p className="text-sm text-muted-foreground">
          Se li enviarà un correu recordant-li que torni la clau. Qui l&apos;envia?
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {concierges.map((c) => (
            <Button
              key={c.id}
              type="button"
              disabled={isPending}
              onClick={() => run({ loanId, remindedById: c.id })}
            >
              {c.name}
            </Button>
          ))}
        </div>
        {concierges.length === 0 && (
          <p className="text-xs text-muted-foreground">
            No hi ha cap conserge donat d&apos;alta.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
