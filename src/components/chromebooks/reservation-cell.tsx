"use client";

import { useState } from "react";

import { createReservation } from "@/actions/chromebooks";
import { CancelReservationButton } from "@/components/chromebooks/cancel-reservation-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import { MissingDevices } from "@/components/chromebooks/missing-devices";
import type { MissingDevice } from "@/lib/device-reservations";
import type { SchoolPeriod } from "@/lib/schedule";

type Reservation = {
  id: string;
  purpose: string | null;
  userId: string;
  recurringId: string | null;
  user: { name: string | null; email: string };
};

export function ReservationCell({
  cartId,
  dayKey,
  dayLabel,
  period,
  reservation,
  canCancel,
  isPast,
  locked,
  holiday,
  devicesOut,
}: {
  cartId: string;
  dayKey: string;
  dayLabel: string;
  period: SchoolPeriod;
  reservation?: Reservation;
  canCancel: boolean;
  /** Sessió que ja ha acabat: es mostra apagada i no es pot reservar. */
  isPast: boolean;
  /** Massa endavant perquè el professorat la reservi: es mostra com una de passada. */
  locked: boolean;
  /** Dia festiu: no hi ha classe i no es pot reservar. */
  holiday: boolean;
  /** Els equips que no hi seran perquè algú els té reservats a part, i qui. */
  devicesOut: MissingDevice[];
}) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");

  const { run, isPending } = useServerAction(createReservation, {
    successMessage: "Reserva confirmada",
    onSuccess: () => {
      setOpen(false);
      setPurpose("");
    },
  });

  if (reservation) {
    return (
      <div className="rounded-md bg-primary/10 p-1.5">
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium">{reservation.user.name ?? reservation.user.email}</span>
          {canCancel && (
            <CancelReservationButton reservationId={reservation.id} fixed={reservation.recurringId !== null} />
          )}
        </div>
        {reservation.recurringId && <p className="text-muted-foreground">Reserva fixa</p>}
        {reservation.purpose && <p className="truncate text-muted-foreground">{reservation.purpose}</p>}
        <MissingDevices devices={devicesOut} />
      </div>
    );
  }

  if (isPast || locked) {
    return (
      <div className="w-full rounded-md border border-dashed border-transparent p-1.5 text-center text-muted-foreground/40">
        —
      </div>
    );
  }

  if (holiday) {
    return <div className="w-full rounded-md bg-muted/60 p-1.5 text-center text-muted-foreground">Festiu</div>;
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="w-full rounded-md border border-dashed p-1.5 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
          />
        }
      >
        Lliure
        <MissingDevices devices={devicesOut} />
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ cartId, date: dayKey, periodIds: [period.id], purpose });
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">
            {dayLabel} · {period.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {period.start}–{period.end}
          </p>
          {devicesOut.length > 0 && (
            <div className="text-xs">
              <p className="text-muted-foreground">No seran al carro, algú els té reservats a part:</p>
              <MissingDevices devices={devicesOut} />
            </div>
          )}
          <Input
            autoFocus
            placeholder="Motiu (opcional)"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={isPending}>
            {isPending ? "Reservant…" : "Reserva aquesta sessió"}
          </Button>
        </form>
      </PopoverContent>
    </Popover>
  );
}
