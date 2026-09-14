"use client";

import { useState, type ReactNode } from "react";
import { CheckIcon, PackageCheckIcon, RotateCcwIcon, XIcon } from "lucide-react";

import {
  cancelStudentDeviceRequest,
  markStudentDeviceDelivered,
  markStudentDeviceReturned,
  respondStudentDeviceRequest,
} from "@/actions/student-devices";
import { useServerAction } from "@/hooks/use-server-action";
import { toSelectItems } from "@/lib/utils";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
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
 * els préstecs d'inventari: aprovar i apartar l'equip són el mateix moment.
 * L'entrega, quan l'alumne el ve a buscar, va a part. Rebutjar també obre un
 * diàleg, perquè al tutor li arriba un correu i quedar-se sense saber per què
 * no ajuda ningú.
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

type LoanStepProps = { id: string; studentName: string; deviceLabel: string };

/**
 * Entregar i tornar desen el moment exacte del clic, que després no es pot
 * corregir, i anul·lar allibera l'equip: tots tres demanen confirmació. Un clic
 * a la fila del costat deixaria un registre fals a l'historial de l'equip.
 */
function ConfirmLoanStep({
  label,
  icon,
  variant,
  title,
  description,
  confirmLabel,
  isPending,
  onConfirm,
}: {
  label: string;
  icon: ReactNode;
  variant: "outline" | "ghost";
  title: string;
  description: string;
  confirmLabel: string;
  isPending: boolean;
  onConfirm: () => void;
}) {
  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <Button size="sm" variant={variant} disabled={isPending}>
            {icon}
            {label}
          </Button>
        }
      />
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel·la</AlertDialogCancel>
          <AlertDialogAction disabled={isPending} onClick={onConfirm}>
            {confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

export function MarkStudentDeviceDeliveredButton({ id, studentName, deviceLabel }: LoanStepProps) {
  const { run, isPending } = useServerAction(markStudentDeviceDelivered, {
    successMessage: "Entrega registrada",
  });

  return (
    <ConfirmLoanStep
      label={isPending ? "Registrant…" : "Marca com entregat"}
      icon={<PackageCheckIcon className="size-4" />}
      variant="outline"
      title={`Entregar ${deviceLabel} a ${studentName}?`}
      description="En queden anotats el dia i l'hora d'ara mateix i qui l'entrega, i no es podran canviar després."
      confirmLabel="Registra l'entrega"
      isPending={isPending}
      onConfirm={() => run({ id })}
    />
  );
}

export function CancelStudentAssignmentButton({ id, studentName, deviceLabel }: LoanStepProps) {
  const { run, isPending } = useServerAction(cancelStudentDeviceRequest, {
    successMessage: "Assignació anul·lada i equip alliberat",
  });

  return (
    <ConfirmLoanStep
      label="Anul·la"
      icon={<XIcon className="size-4" />}
      variant="ghost"
      title={`Anul·lar l'assignació de ${deviceLabel}?`}
      description={`Per quan ${studentName} no el vindrà a buscar o ja no li cal. L'equip torna a quedar lliure i la sol·licitud queda com a cancel·lada.`}
      confirmLabel="Anul·la l'assignació"
      isPending={isPending}
      onConfirm={() => run({ id })}
    />
  );
}

export function MarkStudentDeviceReturnedButton({ id, studentName, deviceLabel }: LoanStepProps) {
  const { run, isPending } = useServerAction(markStudentDeviceReturned, {
    successMessage: "Devolució registrada i equip alliberat",
  });

  return (
    <ConfirmLoanStep
      label={isPending ? "Registrant…" : "Marca com retornat"}
      icon={<RotateCcwIcon className="size-4" />}
      variant="outline"
      title={`${studentName} torna ${deviceLabel}?`}
      description="En queden anotats el dia i l'hora d'ara mateix i qui el rep, i no es podran canviar després. L'equip torna a quedar lliure, llevat que tingui alguna incidència oberta."
      confirmLabel="Registra la devolució"
      isPending={isPending}
      onConfirm={() => run({ id })}
    />
  );
}
