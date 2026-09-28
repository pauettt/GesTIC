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
import {
  Combobox,
  ComboboxContent,
  ComboboxEmpty,
  ComboboxInput,
  ComboboxItem,
  ComboboxList,
} from "@/components/ui/combobox";
import { Field, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";

type Option = { id: string; name: string };

type PickerItem = { id: string; label: string; detail?: string; disabled?: boolean };

/**
 * Llista amb cercador: al clauer hi ha moltes claus i al claustre molta gent,
 * i un desplegable s'havia de recórrer sencer. S'escriu un tros del que surt a
 * l'etiqueta (el número, l'aula, el nom), sense fer cas de majúscules ni accents.
 */
function Picker({
  id,
  items,
  value,
  onChange,
  placeholder,
  empty,
}: {
  id: string;
  items: PickerItem[];
  value: string;
  onChange: (id: string) => void;
  placeholder: string;
  empty: string;
}) {
  return (
    <Combobox
      items={items}
      value={items.find((item) => item.id === value) ?? null}
      onValueChange={(item: PickerItem | null) => onChange(item?.id ?? "")}
      itemToStringLabel={(item: PickerItem) => item.label}
      isItemEqualToValue={(a: PickerItem, b: PickerItem) => a.id === b.id}
      autoHighlight
    >
      <ComboboxInput id={id} placeholder={placeholder} className="w-full" />
      <ComboboxContent>
        <ComboboxEmpty>{empty}</ComboboxEmpty>
        <ComboboxList>
          {(item: PickerItem) => (
            <ComboboxItem key={item.id} value={item} disabled={item.disabled}>
              {item.label}
              {item.detail && <span className="text-muted-foreground">{item.detail}</span>}
            </ComboboxItem>
          )}
        </ComboboxList>
      </ComboboxContent>
    </Combobox>
  );
}

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
              <Picker
                id="deliver-key"
                items={keys.map((k) => ({
                  id: k.id,
                  label: `${k.number} — ${k.name}`,
                  detail:
                    k.available === 0
                      ? "cap còpia disponible"
                      : `${k.available} ${k.available === 1 ? "disponible" : "disponibles"}`,
                  disabled: k.available === 0,
                }))}
                value={selectedKey}
                onChange={setSelectedKey}
                placeholder="Número o aula…"
                empty="Cap clau amb aquest número o aula"
              />
            </Field>
          )}

          {teachers && !borrowerId && (
            <Field>
              <FieldLabel htmlFor="deliver-teacher">A qui?</FieldLabel>
              <Picker
                id="deliver-teacher"
                items={teachers.map((t) => ({ id: t.id, label: t.name }))}
                value={teacher}
                onChange={setTeacher}
                placeholder="Nom del professor/a…"
                empty="Ningú amb aquest nom"
              />
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
                No hi ha cap conserge donat d&apos;alta. El superadministrador/a els crea a
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
