"use client";

import { useState } from "react";
import { KeyRoundIcon } from "lucide-react";

import { deliverKey } from "@/actions/keys";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type Option = { id: string; name: string };

/**
 * Entrega d'una clau. Qui la dona es tria aquí i no una vegada per torn: al
 * taulell hi poden ser els tres conserges alhora amb la mateixa sessió oberta,
 * i el nom fixat seria el del company.
 */
export function DeliverKeyDialog({
  concierges,
  keys,
  keyId,
  borrowerId,
  borrowerName,
  teachers,
  reservationId,
  trigger,
}: {
  concierges: Option[];
  /** Per a l'entrega sense reserva; si ja se sap quina clau és, no cal. */
  keys?: (Option & { number: string; available: number })[];
  keyId?: string;
  borrowerId?: string;
  borrowerName?: string;
  teachers?: Option[];
  reservationId?: string;
  trigger?: React.ReactElement;
}) {
  const [open, setOpen] = useState(false);
  const [concierge, setConcierge] = useState("");
  const [selectedKey, setSelectedKey] = useState(keyId ?? "");
  const [teacher, setTeacher] = useState(borrowerId ?? "");
  const [reason, setReason] = useState("");

  const { run, isPending } = useServerAction(deliverKey, {
    successMessage: "Clau entregada",
    onSuccess: () => {
      setOpen(false);
      setConcierge("");
      setReason("");
      if (!keyId) setSelectedKey("");
      if (!borrowerId) setTeacher("");
    },
  });

  const withoutReservation = !reservationId;
  const canSubmit = Boolean(concierge && selectedKey && teacher);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          trigger ?? (
            <Button size="sm">
              <KeyRoundIcon className="size-4" />
              Entrega la clau
            </Button>
          )
        }
      />
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {borrowerName ? `Entregar la clau a ${borrowerName}` : "Entregar una clau"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {keys && !keyId && (
            <Field>
              <FieldLabel htmlFor="deliver-key">Quina clau?</FieldLabel>
              <Select
                value={selectedKey}
                onValueChange={(v) => setSelectedKey(v ?? "")}
                items={Object.fromEntries(
                  keys.map((k) => [k.id, `${k.number} — ${k.name}`]),
                )}
              >
                <SelectTrigger id="deliver-key" className="w-full">
                  <SelectValue placeholder="Tria la clau" />
                </SelectTrigger>
                <SelectContent>
                  {keys.map((k) => (
                    <SelectItem key={k.id} value={k.id} disabled={k.available === 0}>
                      {k.number} — {k.name}
                      {k.available === 0 ? " (cap còpia disponible)" : ` (${k.available} disponibles)`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {teachers && !borrowerId && (
            <Field>
              <FieldLabel htmlFor="deliver-teacher">A qui?</FieldLabel>
              <Select
                value={teacher}
                onValueChange={(v) => setTeacher(v ?? "")}
                items={Object.fromEntries(teachers.map((t) => [t.id, t.name]))}
              >
                <SelectTrigger id="deliver-teacher" className="w-full">
                  <SelectValue placeholder="Tria el professor/a" />
                </SelectTrigger>
                <SelectContent>
                  {teachers.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          )}

          {withoutReservation && (
            <Field>
              <FieldLabel htmlFor="deliver-reason">Motiu (sense reserva)</FieldLabel>
              <Input
                id="deliver-reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Urgència, substitució…"
              />
            </Field>
          )}

          <Field>
            <FieldLabel>Qui entrega la clau?</FieldLabel>
            <div className="flex flex-wrap gap-2">
              {concierges.map((c) => (
                <Button
                  key={c.id}
                  type="button"
                  variant={concierge === c.id ? "default" : "outline"}
                  onClick={() => setConcierge(c.id)}
                >
                  {c.name}
                </Button>
              ))}
            </div>
            {concierges.length === 0 && (
              <p className="text-xs text-muted-foreground">
                No hi ha cap conserge donat d&apos;alta. L&apos;administrador/a els crea a
                &quot;Usuaris i permisos&quot;.
              </p>
            )}
          </Field>
        </div>

        <div className="mt-2 flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={() => setOpen(false)}>
            Cancel·la
          </Button>
          <Button
            type="button"
            disabled={isPending || !canSubmit}
            onClick={() =>
              run({
                keyId: selectedKey,
                borrowerId: teacher,
                deliveredById: concierge,
                reservationId,
                reason: reason || undefined,
              })
            }
          >
            {isPending ? "Registrant…" : "Entrega la clau"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
