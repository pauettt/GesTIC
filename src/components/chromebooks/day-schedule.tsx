"use client";

import { useState } from "react";
import { CheckIcon } from "lucide-react";

import { createReservation } from "@/actions/chromebooks";
import { CancelReservationButton } from "@/components/chromebooks/cancel-reservation-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerAction } from "@/hooks/use-server-action";
import { cn } from "@/lib/utils";

export type DaySlot =
  | { kind: "free" }
  | { kind: "past" }
  | { kind: "reserved"; id: string; who: string; purpose: string | null; canCancel: boolean };

export type ScheduleDay = {
  dayKey: string;
  label: string;
  shortLabel: string;
  dayOfMonth: number;
  /** Una casella per sessió, en l'ordre de `periods`. */
  slots: DaySlot[];
};

type Period = { id: number; label: string; start: string; end: string };

/**
 * La graella d'un carro, un dia rere l'altre: la de tota la setmana no cap en un
 * mòbil. Les sessions lliures es toquen per triar-les —una o unes quantes
 * seguides— i es reserven totes alhora.
 */
export function DaySchedule({
  cartId,
  days,
  periods,
  recessBeforeIndex,
  recessLabel,
  initialDayKey,
}: {
  cartId: string;
  days: ScheduleDay[];
  periods: Period[];
  recessBeforeIndex: number;
  recessLabel: string;
  initialDayKey: string;
}) {
  const [dayKey, setDayKey] = useState(initialDayKey);
  const [selected, setSelected] = useState<number[]>([]);
  const [purpose, setPurpose] = useState("");
  const day = days.find((candidate) => candidate.dayKey === dayKey) ?? days[0];

  const { run, isPending } = useServerAction(createReservation, {
    successMessage: "Reserva confirmada",
    onSuccess: () => {
      setSelected([]);
      setPurpose("");
    },
  });

  function toggle(periodId: number) {
    setSelected((current) =>
      current.includes(periodId) ? current.filter((id) => id !== periodId) : [...current, periodId],
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-5 gap-1" role="tablist" aria-label="Dia de la setmana">
        {days.map((candidate) => (
          <button
            key={candidate.dayKey}
            type="button"
            role="tab"
            aria-selected={candidate.dayKey === day.dayKey}
            onClick={() => {
              setDayKey(candidate.dayKey);
              // Una reserva és d'un sol dia: el que s'havia triat en un altre no hi compta.
              setSelected([]);
            }}
            className={cn(
              "flex flex-col items-center rounded-md border py-1.5 text-xs",
              candidate.dayKey === day.dayKey ? "border-primary bg-primary text-primary-foreground" : "hover:bg-muted",
            )}
          >
            <span aria-hidden>{candidate.shortLabel}</span>
            <span className="sr-only">{candidate.label}</span>
            <span className="text-sm font-semibold">{candidate.dayOfMonth}</span>
          </button>
        ))}
      </div>

      <ul className="flex flex-col gap-1.5" aria-label={`Sessions de ${day.label}`}>
        {periods.map((period, index) => {
          const slot = day.slots[index];
          const isSelected = selected.includes(period.id);
          return (
            <li key={period.id} className="flex flex-col gap-1.5">
              {index === recessBeforeIndex && (
                <p className="rounded-md bg-muted/60 py-1 text-center text-xs text-muted-foreground">
                  {recessLabel}
                </p>
              )}
              <div className="flex items-center gap-3">
                <div className="w-20 shrink-0 text-xs text-muted-foreground">
                  <div className="font-medium text-foreground">{period.label}</div>
                  {period.start}–{period.end}
                </div>
                {slot.kind === "reserved" ? (
                  <div className="flex min-w-0 flex-1 items-center justify-between gap-1 rounded-md bg-primary/10 px-3 py-2 text-sm">
                    <span className="min-w-0">
                      <span className="block truncate font-medium">{slot.who}</span>
                      {slot.purpose && (
                        <span className="block truncate text-xs text-muted-foreground">{slot.purpose}</span>
                      )}
                    </span>
                    {slot.canCancel && <CancelReservationButton reservationId={slot.id} />}
                  </div>
                ) : slot.kind === "past" ? (
                  <div className="flex-1 px-3 py-2 text-sm text-muted-foreground/50">—</div>
                ) : (
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    aria-label={`${period.label}, ${period.start}–${period.end}: lliure`}
                    onClick={() => toggle(period.id)}
                    className={cn(
                      "flex flex-1 items-center justify-between rounded-md border px-3 py-2 text-left text-sm transition-colors",
                      isSelected
                        ? "border-primary bg-primary/10 font-medium"
                        : "border-dashed text-muted-foreground hover:border-primary",
                    )}
                  >
                    {isSelected ? "Triada" : "Lliure"}
                    {isSelected && <CheckIcon className="size-4 text-primary" />}
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {selected.length > 0 && (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            run({ cartId, date: day.dayKey, periodIds: [...selected].sort((a, b) => a - b), purpose });
          }}
          className="sticky bottom-2 flex flex-col gap-2 rounded-lg border bg-background p-3 shadow-lg"
        >
          <Input placeholder="Motiu (opcional)" value={purpose} onChange={(event) => setPurpose(event.target.value)} />
          <Button type="submit" disabled={isPending}>
            {isPending
              ? "Reservant…"
              : selected.length === 1
                ? `Reserva 1 sessió (${day.label})`
                : `Reserva ${selected.length} sessions (${day.label})`}
          </Button>
        </form>
      )}
    </div>
  );
}
