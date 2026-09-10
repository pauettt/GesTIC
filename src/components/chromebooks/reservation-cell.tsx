"use client";

import { useState } from "react";

import { createReservation } from "@/actions/chromebooks";
import { CancelReservationButton } from "@/components/chromebooks/cancel-reservation-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import type { SchoolPeriod } from "@/lib/schedule";

type Reservation = {
  id: string;
  purpose: string | null;
  userId: string;
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
}: {
  cartId: string;
  dayKey: string;
  dayLabel: string;
  period: SchoolPeriod;
  reservation?: Reservation;
  canCancel: boolean;
  /** Sessió que ja ha acabat: es mostra apagada i no es pot reservar. */
  isPast: boolean;
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
          {canCancel && <CancelReservationButton reservationId={reservation.id} />}
        </div>
        {reservation.purpose && <p className="truncate text-muted-foreground">{reservation.purpose}</p>}
      </div>
    );
  }

  if (isPast) {
    return (
      <div className="w-full rounded-md border border-dashed border-transparent p-1.5 text-center text-muted-foreground/40">
        —
      </div>
    );
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
