"use client";

import { useState } from "react";
import { CalendarClockIcon } from "lucide-react";

import { cancelDeviceReservation, createDeviceReservation, returnReservedDevice } from "@/actions/device-reservations";
import { useServerAction } from "@/hooks/use-server-action";
import { defaultCartSearch } from "@/lib/cart-finder";
import { madridDateKey } from "@/lib/date";
import { bookingSpanLabel, dayLabel, dueLabel, type DeviceReservationView } from "@/lib/device-reservations";
import { SCHOOL_PERIODS } from "@/lib/schedule";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Field, FieldGroup, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

function ReturnButton({ reservation }: { reservation: DeviceReservationView }) {
  const { run, isPending } = useServerAction(returnReservedDevice, { successMessage: "Equip tornat al carro" });
  return (
    <Button
      type="button"
      size="xs"
      variant={reservation.overdue ? "destructive" : "outline"}
      disabled={isPending}
      onClick={() => run({ id: reservation.id })}
    >
      {reservation.mine ? "L'he tornat" : "Marca com a tornat"}
    </Button>
  );
}

function CancelButton({ reservationId }: { reservationId: string }) {
  const { run, isPending } = useServerAction(cancelDeviceReservation, { successMessage: "Reserva cancel·lada" });
  return (
    <Button type="button" size="xs" variant="ghost" disabled={isPending} onClick={() => run({ id: reservationId })}>
      Cancel·la
    </Button>
  );
}

/** Tornar-lo, si ja ha començat, o cancel·lar-la, si encara no: per a qui l'ha feta o la coordinació. */
export function DeviceReservationAction({ reservation }: { reservation: DeviceReservationView }) {
  if (!reservation.canManage) return null;
  return reservation.held ? (
    <ReturnButton reservation={reservation} />
  ) : (
    <CancelButton reservationId={reservation.id} />
  );
}

/**
 * Qui té l'equip ara i qui el té reservat més endavant, perquè ningú no l'agafi
 * sense saber-ho. Qui l'ha reservat, o la coordinació, el torna o la cancel·la
 * d'aquí mateix.
 */
export function DeviceReservationList({ reservations }: { reservations: DeviceReservationView[] }) {
  if (reservations.length === 0) return null;

  return (
    <ul className="flex flex-col gap-1.5" aria-label="Reserves de l'equip">
      {reservations.map((reservation) => (
        <li
          key={reservation.id}
          className={cn(
            "flex flex-col gap-1.5 rounded-md px-2 py-1.5 text-xs",
            reservation.held ? "bg-red-50 text-red-900 dark:bg-red-950/40 dark:text-red-200" : "bg-muted",
          )}
        >
          <div className="min-w-0">
            {/* La que ja ha començat és el motiu pel qual l'equip no hi és. */}
            <p className="font-medium">{reservation.held ? `Reserva · ${reservation.who}` : reservation.who}</p>
            <p className="opacity-80">
              {reservation.held
                ? reservation.overdue
                  ? `L'havia de tornar ${dueLabel(reservation.endDate)}`
                  : `El té fins ${dueLabel(reservation.endDate)}`
                : `${dayLabel(reservation.startDate)} · ${bookingSpanLabel(reservation)}`}
            </p>
            {reservation.purpose && <p className="truncate opacity-80">{reservation.purpose}</p>}
          </div>
          {reservation.canManage && (
            <div className="flex justify-end">
              <DeviceReservationAction reservation={reservation} />
            </div>
          )}
        </li>
      ))}
    </ul>
  );
}

// «Des de» diu quan comença cada sessió i «Fins a», quan acaba: és el que es tria.
const fromItems = SCHOOL_PERIODS.map((period) => ({ value: String(period.id), label: `${period.label} · ${period.start}` }));
const toItemsAll = SCHOOL_PERIODS.map((period) => ({ value: String(period.id), label: `${period.label} · ${period.end}` }));

/**
 * El formulari de reservar un equip: el dia i de quina sessió a quina. Es
 * munta cada cop que s'obre el diàleg, de manera que proposa sempre la sessió
 * que encara no ha acabat.
 */
function ReserveDeviceForm({
  chromebookId,
  reservations,
  onDone,
}: {
  chromebookId: string;
  reservations: DeviceReservationView[];
  onDone: () => void;
}) {
  const [initial] = useState(() => defaultCartSearch());
  const [dateKey, setDateKey] = useState(initial.dateKey);
  const [fromId, setFromId] = useState(String(initial.periodId));
  const [toId, setToId] = useState(String(initial.periodId));
  const [purpose, setPurpose] = useState("");
  const { run, isPending } = useServerAction(createDeviceReservation, {
    successMessage: "Equip reservat",
    onSuccess: onDone,
  });

  // Les que ja té aquell dia, perquè no calgui provar-ho per saber-ho.
  const sameDay = reservations.filter(
    (reservation) => reservation.held || madridDateKey(reservation.startDate) === dateKey,
  );
  const toItems = toItemsAll.filter((item) => Number(item.value) >= Number(fromId));

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault();
        run({ chromebookId, date: dateKey, fromPeriodId: Number(fromId), toPeriodId: Number(toId), purpose });
      }}
    >
      <FieldGroup>
        <Field>
          <FieldLabel htmlFor="device-reservation-day">Dia</FieldLabel>
          <Input
            id="device-reservation-day"
            type="date"
            value={dateKey}
            onChange={(event) => setDateKey(event.target.value)}
            required
          />
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field>
            <FieldLabel htmlFor="device-reservation-from">Des de</FieldLabel>
            <Select
              value={fromId}
              onValueChange={(next) => {
                if (!next) return;
                setFromId(next);
                // L'última no pot quedar abans de la primera.
                if (Number(toId) < Number(next)) setToId(next);
              }}
              items={fromItems}
            >
              <SelectTrigger id="device-reservation-from" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {fromItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field>
            <FieldLabel htmlFor="device-reservation-to">Fins a</FieldLabel>
            <Select value={toId} onValueChange={(next) => next && setToId(next)} items={toItems}>
              <SelectTrigger id="device-reservation-to" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {toItems.map((item) => (
                  <SelectItem key={item.value} value={item.value}>
                    {item.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
        </div>
        <Field>
          <FieldLabel htmlFor="device-reservation-purpose">Motiu (opcional)</FieldLabel>
          <Input
            id="device-reservation-purpose"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
            maxLength={300}
          />
        </Field>
        {sameDay.length > 0 && (
          <div className="flex flex-col gap-1">
            <p className="text-xs font-medium text-muted-foreground">Aquell dia ja el té:</p>
            <DeviceReservationList
              reservations={sameDay.map((reservation) => ({ ...reservation, canManage: false }))}
            />
          </div>
        )}
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel·la
          </Button>
          <Button type="submit" disabled={isPending}>
            {isPending ? "Reservant…" : "Reserva"}
          </Button>
        </div>
      </FieldGroup>
    </form>
  );
}

/** El diàleg de reservar un equip sol, obert des de la seva casella del carro. */
export function ReserveDeviceDialog({
  chromebookId,
  deviceLabel,
  reservations,
  open,
  onOpenChange,
}: {
  chromebookId: string;
  /** «Chromebook C1-07». */
  deviceLabel: string;
  reservations: DeviceReservationView[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reserva {deviceLabel}</DialogTitle>
          <DialogDescription>
            Des que comenci la primera sessió i fins que el tornis, sortirà com a no disponible amb el teu nom.
            Si s&apos;acaba el dia i no l&apos;has tornat, t&apos;arribarà un avís, i a la coordinació TIC també.
          </DialogDescription>
        </DialogHeader>
        {open && (
          <ReserveDeviceForm
            chromebookId={chromebookId}
            reservations={reservations}
            onDone={() => onOpenChange(false)}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}

/** El botó que obre el diàleg, dins la fitxa de l'equip. */
export function ReserveDeviceButton({ onClick }: { onClick: () => void }) {
  return (
    <Button type="button" size="sm" variant="outline" onClick={onClick}>
      <CalendarClockIcon className="size-4" />
      Reserva aquest equip
    </Button>
  );
}
