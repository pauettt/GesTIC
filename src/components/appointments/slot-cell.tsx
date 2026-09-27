"use client";

import { useState } from "react";
import { PlusIcon } from "lucide-react";

import { bookAppointment, closeAppointmentSlot, openAppointmentSlot } from "@/actions/appointments";
import { CancelAppointmentButton } from "@/components/appointments/cancel-appointment-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useServerAction } from "@/hooks/use-server-action";
import type { SchoolPeriod } from "@/lib/schedule";

// Només el que la casella ensenya. Aquestes dades viatgen al navegador de
// tothom qui obre la graella, així que aquí no hi entra la fila d'usuari
// sencera —correu, rol, marca de tutoria— sinó el nom ja resolt.
export type SlotCellSlot = {
  id: string;
  /** Surt d'una hora fixa: tancar-la només tanca aquesta setmana. */
  fixed: boolean;
  /** Qui l'atén. El professorat el veu abans de demanar-la: és amb qui tindrà la cita. */
  coordinatorId: string | null;
  coordinatorName: string | null;
  /**
   * Fals si qui l'atén ja no és a la coordinació: ningú no la pot demanar. Al
   * professorat ni li arriba; qui porta l'agenda la veu per tancar-la.
   */
  bookable: boolean;
  /**
   * La cita de la plaça. Qui la té i per a què només hi van si qui mira és la
   * coordinació o la mateixa persona: la resta del claustre veu que la plaça està
   * agafada i prou. El motiu és text lliure, i el filtre es fa al servidor,
   * abans que arribi aquí.
   */
  appointment: {
    id: string;
    isOwn: boolean;
    purpose: string | null;
    userName: string | null;
  } | null;
};

export type SlotCellCoordinator = { id: string; name: string };

type CellProps = {
  dayKey: string;
  dayLabel: string;
  period: SchoolPeriod;
  /** Superadministrador: obre i tanca places. L'agenda la porta aquest compte. */
  canOpen: boolean;
  /** Coordinació TIC: cancel·la qualsevol cita. */
  canManage: boolean;
  /** Hora que ja ha acabat: només s'hi veuen les cites que hi va haver. */
  isPast: boolean;
};

/**
 * Una casella de la graella: les places d'una hora, una per coordinador. Cada
 * plaça pot estar lliure o amb cita, i el que se'n pot fer depèn de qui mira: el
 * superadministrador obre i tanca places, la coordinació pot cancel·lar
 * qualsevol cita, i tothom del claustre hi pot demanar cita, triant amb qui.
 */
export function SlotCell({
  slots,
  coordinators,
  ...cell
}: CellProps & {
  slots: SlotCellSlot[];
  /** A qui es pot obrir una plaça. Buit per a qui no porta l'agenda. */
  coordinators: SlotCellCoordinator[];
}) {
  const visible = cell.isPast ? slots.filter((slot) => slot.appointment) : slots;
  const openable =
    cell.canOpen && !cell.isPast
      ? coordinators.filter((coordinator) => !slots.some((slot) => slot.coordinatorId === coordinator.id))
      : [];

  if (visible.length === 0 && openable.length === 0) {
    return (
      <div className="w-full p-1.5 text-center text-muted-foreground/40" aria-hidden>
        —
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-1">
      {visible.map((slot) => (
        <SlotEntry key={slot.id} slot={slot} {...cell} />
      ))}
      {openable.length > 0 && <OpenSlotButton coordinators={openable} compact={visible.length > 0} {...cell} />}
    </div>
  );
}

function SlotEntry({ slot, dayLabel, period, canOpen, canManage, isPast }: CellProps & { slot: SlotCellSlot }) {
  const [open, setOpen] = useState(false);
  const [purpose, setPurpose] = useState("");
  const coordinatorName = slot.coordinatorName ?? "Sense coordinador";

  const book = useServerAction(bookAppointment, {
    successMessage: "Cita confirmada",
    onSuccess: () => {
      setOpen(false);
      setPurpose("");
    },
  });
  const closeSlot = useServerAction(closeAppointmentSlot, {
    successMessage: "Plaça tancada",
    onSuccess: () => setOpen(false),
  });

  if (slot.appointment) {
    const { appointment } = slot;
    return (
      <div className={appointment.isOwn ? "rounded-md bg-primary/15 p-1.5" : "rounded-md bg-muted p-1.5"}>
        <div className="flex items-center justify-between gap-1">
          <span className="truncate font-medium">
            {appointment.isOwn ? "La teva cita" : (appointment.userName ?? "Ocupada")}
          </span>
          {(appointment.isOwn || canManage) && !isPast && (
            <CancelAppointmentButton appointmentId={appointment.id} />
          )}
        </div>
        {appointment.purpose && <p className="truncate text-muted-foreground">{appointment.purpose}</p>}
        <p className="truncate text-muted-foreground" title={coordinatorName}>
          amb {coordinatorName}
        </p>
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={
              slot.bookable ? `Lliure amb ${coordinatorName}` : `${coordinatorName}, ja no és a la coordinació`
            }
            title={coordinatorName}
            className={
              slot.bookable
                ? "w-full truncate rounded-md border border-dashed border-primary/40 p-1.5 text-center transition-colors hover:border-primary hover:bg-primary/5"
                : "w-full truncate rounded-md border border-dashed p-1.5 text-center text-muted-foreground line-through transition-colors hover:bg-muted"
            }
          />
        }
      >
        {coordinatorName}
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
            {period.start}–{period.end} · amb {coordinatorName}
          </p>
          {slot.bookable ? (
            <>
              <Input
                autoFocus
                placeholder="Per a què la vols?"
                value={purpose}
                onChange={(event) => setPurpose(event.target.value)}
              />
              <Button type="submit" size="sm" disabled={book.isPending}>
                {book.isPending ? "Demanant…" : "Demana aquesta cita"}
              </Button>
            </>
          ) : (
            <p className="text-xs text-muted-foreground">
              Ja no és a la coordinació TIC: ningú no pot demanar aquesta plaça.
            </p>
          )}
          {canOpen && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={closeSlot.isPending}
              onClick={() => closeSlot.run({ id: slot.id })}
            >
              {slot.fixed ? "Tanca-la només aquesta setmana" : "Tanca aquesta plaça"}
            </Button>
          )}
        </form>
      </PopoverContent>
    </Popover>
  );
}

/** Obre una plaça d'aquella hora, només aquella setmana, per al coordinador que es triï. */
function OpenSlotButton({
  coordinators,
  compact,
  dayKey,
  dayLabel,
  period,
}: CellProps & { coordinators: SlotCellCoordinator[]; compact: boolean }) {
  const [open, setOpen] = useState(false);
  const openSlot = useServerAction(openAppointmentSlot, {
    successMessage: "Plaça oberta",
    onSuccess: () => setOpen(false),
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <button
            type="button"
            aria-label={compact ? `Obre una altra plaça: ${dayLabel} · ${period.label}` : undefined}
            title={`Obre ${dayLabel} · ${period.label} per a cites`}
            className={
              compact
                ? "flex w-full items-center justify-center rounded-md p-1 text-muted-foreground/60 transition-colors hover:bg-primary/5 hover:text-foreground"
                : "w-full rounded-md border border-dashed p-1.5 text-center text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground"
            }
          />
        }
      >
        {compact ? <PlusIcon className="size-3.5" /> : "Obre"}
      </PopoverTrigger>
      <PopoverContent className="w-64">
        <div className="flex flex-col gap-2">
          <p className="text-sm font-medium">
            {dayLabel} · {period.label}
          </p>
          <p className="text-xs text-muted-foreground">Només aquesta setmana. Qui l&apos;atendrà?</p>
          {coordinators.map((coordinator) => (
            <Button
              key={coordinator.id}
              type="button"
              variant="outline"
              size="sm"
              className="justify-start"
              disabled={openSlot.isPending}
              onClick={() => openSlot.run({ date: dayKey, periodId: period.id, coordinatorId: coordinator.id })}
            >
              <span className="truncate">Obre amb {coordinator.name}</span>
            </Button>
          ))}
        </div>
      </PopoverContent>
    </Popover>
  );
}
