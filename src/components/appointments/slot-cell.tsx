"use client";

import { useState } from "react";

import { bookAppointment, closeAppointmentSlot, openAppointmentSlot } from "@/actions/appointments";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import type { SchoolPeriod } from "@/lib/schedule";

export type SlotCellSlot = {
  id: string;
  openedByName: string | null;
  appointment: {
    id: string;
    purpose: string;
    userId: string;
    user: { name: string | null; email: string };
  } | null;
};

/**
 * Una casella de la graella. Té tres estats —tancada, oberta i lliure, i amb
 * cita— i el que se'n pot fer depèn de qui mira: la coordinació obre i tanca
 * hores, i tothom del claustre hi pot demanar cita.
 */
export function SlotCell({
  dayKey,
  dayLabel,
  period,
  slot,
  canManage,
  isOwn,
  isPast,
}: {
  dayKey: string;
  dayLabel: string;
  period: SchoolPeriod;
  slot?: SlotCellSlot;
  /** Coordinació TIC: obre i tanca hores. */
  canManage: boolean;
  isOwn: boolean;
  /** Hora que ja ha acabat: es mostra apagada i no s'hi pot fer res. */
  isPast: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");

  const book = useServerAction(bookAppointment, {
    successMessage: "Cita confirmada",
    onSuccess: () => {
      setOpen(false);
      setPurpose("");
    },
  });
  const openSlot = useServerAction(openAppointmentSlot, { successMessage: "Hora oberta" });
  const closeSlot = useServerAction(closeAppointmentSlot, {
    successMessage: "Hora tancada",
    onSuccess: () => setOpen(false),
  });

  if (slot?.appointment) {
    const { appointment } = slot;
    return (
      <div className={isOwn ? "rounded-md bg-primary/15 p-1.5" : "rounded-md bg-muted p-1.5"}>
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium">
            {isOwn ? "La teva cita" : (appointment.user.name ?? appointment.user.email)}
          </span>
          {(isOwn || canManage) && !isPast && (
            <CancelAppointmentButton appointmentId={appointment.id} />
          )}
        </div>
        <p className="truncate text-muted-foreground">{appointment.purpose}</p>
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

  // Hora que la coordinació no ha obert: no hi ha res a fer-hi si no ets tu qui
  // les obre.
  if (!slot) {
    if (!canManage) {
      return (
        <div className="w-full p-1.5 text-center text-muted-foreground/40" aria-hidden>
          —
        </div>
      );
    }
    return (
      <button
        type="button"
        disabled={openSlot.isPending}
        title={`Obre ${dayLabel} · ${period.label} per a cites`}
        onClick={() => openSlot.run({ date: dayKey, periodId: period.id })}
        className="w-full rounded-md border border-dashed p-1.5 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
      >
        Obre
      </button>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            className="w-full rounded-md border border-dashed border-primary/40 p-1.5 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
          />
        }
      >
        Lliure
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            book.run({ slotId: slot.id, purpose });
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm font-medium">
            {dayLabel} · {period.label}
          </p>
          <p className="text-xs text-muted-foreground">
            {period.start}–{period.end}
            {slot.openedByName ? ` · amb ${slot.openedByName}` : ""}
          </p>
          <Input
            autoFocus
            placeholder="Per a què la vols?"
            value={purpose}
            onChange={(event) => setPurpose(event.target.value)}
          />
          <Button type="submit" size="sm" disabled={book.isPending}>
            {book.isPending ? "Demanant…" : "Demana aquesta cita"}
          </Button>
          {canManage && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={closeSlot.isPending}
              onClick={() => closeSlot.run({ id: slot.id })}
            >
              Tanca aquesta hora
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}
