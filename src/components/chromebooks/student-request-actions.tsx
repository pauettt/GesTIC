"use client";

import { useState } from "react";
import { CheckIcon, RotateCcwIcon, XIcon } from "lucide-react";

import {
  cancelStudentDeviceRequest,
  markStudentDeviceReturned,
  respondStudentDeviceRequest,
} from "@/actions/student-devices";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

export type AvailableDevice = { id: string; assetTag: string; serialNumber: string | null };

const deviceLabel = (device: AvailableDevice) =>
  [device.assetTag, device.serialNumber].filter(Boolean).join(" · ");

/**
 * Aprovar demana triar equip, i per això va amb diàleg i no amb un sol clic com
 * els préstecs d'inventari: aprovar i assignar són el mateix moment. Rebutjar
 * també n'obre un, perquè al tutor li arriba un correu i quedar-se sense saber
 * per què no ajuda ningú.
 */
export function RespondStudentRequestButtons({
  id,
  available,
}: {
  id: string;
  available: AvailableDevice[];
}) {
  const [approveOpen, setApproveOpen] = useState(false);
  const [rejectOpen, setRejectOpen] = useState(false);
  const [chromebookId, setChromebookId] = useState("");
  const [approveNote, setApproveNote] = useState("");
  const [rejectNote, setRejectNote] = useState("");

  const approve = useServerAction(respondStudentDeviceRequest, {
    successMessage: "Sol·licitud aprovada i equip assignat",
    onSuccess: () => {
      setApproveOpen(false);
      setChromebookId("");
      setApproveNote("");
    },
  });
  const reject = useServerAction(respondStudentDeviceRequest, {
    successMessage: "Sol·licitud rebutjada",
    onSuccess: () => {
      setRejectOpen(false);
      setRejectNote("");
    },
  });

  return (
    <div className="flex justify-end gap-1">
      <Dialog open={approveOpen} onOpenChange={setApproveOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="outline">
              <CheckIcon className="size-4" />
              Aprova
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Aprova i assigna un equip</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            {available.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No hi ha cap equip lliure al pool de préstec. Afegeix-n&apos;hi un o espera que
                se&apos;n torni algun abans d&apos;aprovar la sol·licitud.
              </p>
            ) : (
              <Field>
                <FieldLabel htmlFor={`device-${id}`}>Equip</FieldLabel>
                <Select
                  value={chromebookId}
                  onValueChange={(value) => setChromebookId(value ?? "")}
                  items={toSelectItems(available, (d) => d.id, deviceLabel)}
                >
                  <SelectTrigger id={`device-${id}`} className="w-full">
                    <SelectValue placeholder="Tria quin Chromebook se li assigna" />
                  </SelectTrigger>
                  <SelectContent>
                    {available.map((device) => (
                      <SelectItem key={device.id} value={device.id}>
                        {deviceLabel(device)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </Field>
            )}
            <Field>
              <FieldLabel htmlFor={`approve-note-${id}`}>Nota per al tutor/a (opcional)</FieldLabel>
              <Textarea
                id={`approve-note-${id}`}
                rows={2}
                value={approveNote}
                onChange={(event) => setApproveNote(event.target.value)}
                placeholder="Ex: passa a recollir-lo dijous a primera hora"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setApproveOpen(false)}>
                Cancel·la
              </Button>
              <Button
                type="button"
                disabled={approve.isPending || !chromebookId}
                onClick={() =>
                  approve.run({
                    id,
                    status: "APROVADA",
                    chromebookId,
                    responseNote: approveNote,
                  })
                }
              >
                {approve.isPending ? "Assignant…" : "Aprova i assigna"}
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogTrigger
          render={
            <Button size="sm" variant="ghost">
              <XIcon className="size-4" />
              Rebutja
            </Button>
          }
        />
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rebutja la sol·licitud</DialogTitle>
          </DialogHeader>
          <FieldGroup>
            <Field>
              <FieldLabel htmlFor={`reject-note-${id}`}>Motiu (opcional)</FieldLabel>
              <Textarea
                id={`reject-note-${id}`}
                rows={3}
                value={rejectNote}
                onChange={(event) => setRejectNote(event.target.value)}
                placeholder="El tutor/a ho rebrà per correu"
              />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRejectOpen(false)}>
                Cancel·la
              </Button>
              <Button
                type="button"
                variant="destructive"
                disabled={reject.isPending}
                onClick={() => reject.run({ id, status: "REBUTJADA", responseNote: rejectNote })}
              >
                {reject.isPending ? "Desant…" : "Rebutja"}
              </Button>
            </div>
          </FieldGroup>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function CancelStudentRequestButton({ id }: { id: string }) {
  const { run, isPending } = useServerAction(cancelStudentDeviceRequest, {
    successMessage: "Sol·licitud retirada",
  });

  return (
    <Button size="sm" variant="ghost" disabled={isPending} onClick={() => run({ id })}>
      Retira-la
    </Button>
  );
}

export function MarkStudentDeviceReturnedButton({ id }: { id: string }) {
  const { run, isPending } = useServerAction(markStudentDeviceReturned, {
    successMessage: "Devolució registrada i equip alliberat",
  });

  return (
    <Button size="sm" variant="outline" disabled={isPending} onClick={() => run({ id })}>
      <RotateCcwIcon className="size-4" />
      {isPending ? "Registrant…" : "Marca com retornat"}
    </Button>
  );
}
