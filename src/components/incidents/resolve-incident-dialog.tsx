"use client";

import { useState } from "react";
import { MailIcon } from "lucide-react";

import { updateIncidentStatus } from "@/actions/incidents";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Textarea } from "@/components/ui/textarea";

export function ResolveIncidentDialog({
  incidentId,
  reporterName,
  notifies,
  open,
  onOpenChange,
}: {
  incidentId: string;
  reporterName: string;
  /** Fals quan qui resol és qui va reportar-la: llavors no s'envia cap correu. */
  notifies: boolean;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [note, setNote] = useState("");

  const { run, isPending } = useServerAction(updateIncidentStatus, {
    successMessage: notifies ? `Incidència resolta i ${reporterName} avisat/da` : "Incidència resolta",
    onSuccess: () => {
      onOpenChange(false);
      setNote("");
    },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        onOpenChange(next);
        if (!next) setNote("");
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Resoldre la incidència</DialogTitle>
          <DialogDescription>
            {notifies ? (
              <span className="flex items-center gap-1.5">
                <MailIcon className="size-4 shrink-0" />
                S&apos;avisarà {reporterName} per correu.
              </span>
            ) : (
              "Has reportat tu aquesta incidència, així que no s'enviarà cap correu."
            )}
          </DialogDescription>
        </DialogHeader>

        <FieldGroup>
          <Field>
            <FieldLabel htmlFor="resolve-note">
              Comentari per a qui l&apos;ha reportada (opcional)
            </FieldLabel>
            <Textarea
              id="resolve-note"
              rows={4}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Ex: S'ha canviat el cable HDMI del projector."
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel·la
            </Button>
            <Button
              type="button"
              disabled={isPending}
              onClick={() => run({ incidentId, status: "RESOLTA", note })}
            >
              {isPending ? "Desant…" : notifies ? "Resol i avisa" : "Resol"}
            </Button>
          </div>
        </FieldGroup>
      </DialogContent>
    </Dialog>
  );
}
