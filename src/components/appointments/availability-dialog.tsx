"use client";

import { Fragment, useState } from "react";
import { CalendarSyncIcon, CheckIcon, PlusIcon } from "lucide-react";

import { addAppointmentAvailability, removeAppointmentAvailability } from "@/actions/appointment-availability";
import { useServerAction } from "@/hooks/use-server-action";
import { everyWeekLabel, slotLabel } from "@/lib/recurring-reservations";
import {
  RECESS,
  RECESS_BEFORE_PERIOD_INDEX,
  SCHOOL_PERIODS,
  SCHOOL_WEEKDAYS,
  SCHOOL_WEEKDAYS_SHORT,
  type SchoolPeriod,
} from "@/lib/schedule";
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
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Field, FieldLabel } from "@/components/ui/field";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export type FixedHour = { id: string; coordinatorId: string; weekday: number; periodId: number };

/** `active` és fals per a qui ja no és a la coordinació: només se li poden treure les hores. */
export type AvailabilityCoordinator = { id: string; name: string; active: boolean };

/** «5 d'oct., 12 d'oct. i 19 d'oct.», i a partir de cinc, «… i 3 més». */
function dayList(days: string[]) {
  const shown = days.slice(0, 5);
  const rest = days.length - shown.length;
  if (rest > 0) return `${shown.join(", ")} i ${rest} més`;
  return shown.length > 1 ? `${shown.slice(0, -1).join(", ")} i ${shown[shown.length - 1]}` : shown.join("");
}

/**
 * Les hores fixes de cada coordinador: les que té lliures cada setmana segons el
 * seu horari. El superadministrador les marca un cop a l'inici de curs, un
 * coordinador rere l'altre, damunt la mateixa forma de graella que l'agenda, i
 * cada una obre aquella hora totes les setmanes que queden fins al 30 de juny,
 * menys els festius.
 */
export function AvailabilityDialog({
  coordinators,
  fixedHours,
  schoolYear,
  courseEnd,
}: {
  coordinators: AvailabilityCoordinator[];
  fixedHours: FixedHour[];
  /** «2026-2027». */
  schoolYear: string;
  /** «30 de juny del 2027». */
  courseEnd: string;
}) {
  const [selectedId, setSelectedId] = useState(coordinators[0]?.id ?? "");
  const selected = coordinators.find((coordinator) => coordinator.id === selectedId) ?? coordinators[0];
  const hoursOf = (coordinatorId: string) => fixedHours.filter((fixed) => fixed.coordinatorId === coordinatorId);
  const selectedHours = selected ? hoursOf(selected.id) : [];
  const findFixed = (weekday: number, periodId: number) =>
    selectedHours.find((fixed) => fixed.weekday === weekday && fixed.periodId === periodId);

  const items = coordinators.map((coordinator) => {
    const count = hoursOf(coordinator.id).length;
    const hours = count === 0 ? "cap hora" : count === 1 ? "1 hora" : `${count} hores`;
    return {
      value: coordinator.id,
      label: `${coordinator.name} · ${hours}${coordinator.active ? "" : " · ja no és a la coordinació"}`,
    };
  });

  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline">
            <CalendarSyncIcon className="size-4" />
            Hores fixes
          </Button>
        }
      />
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Hores fixes del curs {schoolYear}</DialogTitle>
          <DialogDescription>
            Tria un coordinador i marca les hores que té lliures cada setmana: s&apos;obren totes les
            setmanes fins al {courseEnd}, menys els festius, i el professorat hi veu amb qui és cada
            hora. Un dia que no hi pugui ser, tanca aquella plaça a la graella.
          </DialogDescription>
        </DialogHeader>

        {!selected ? (
          <p className="text-sm text-muted-foreground">
            No hi ha ningú a la coordinació TIC. Dona-li el permís a Usuaris i permisos.
          </p>
        ) : (
          <>
            <Field>
              <FieldLabel htmlFor="availability-coordinator">Coordinador/a</FieldLabel>
              <Select value={selected.id} onValueChange={(next) => setSelectedId(next ?? "")} items={items}>
                <SelectTrigger id="availability-coordinator" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {items.map((item) => (
                    <SelectItem key={item.value} value={item.value}>
                      {item.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            {/* Columnes iguals i, al mòbil, icones: hi han de cabre els cinc dies sense desplaçar-se. */}
            <div className="rounded-lg border">
              <table className="w-full table-fixed border-collapse text-xs" aria-label="Hores fixes">
                <thead>
                  <tr className="border-b bg-muted/40">
                    <th className="w-14 p-2 text-left font-medium text-muted-foreground sm:w-24">Sessió</th>
                    {SCHOOL_WEEKDAYS.map((day, index) => (
                      <th key={day} className="p-2 text-center font-medium">
                        <span className="sm:hidden">{SCHOOL_WEEKDAYS_SHORT[index]}</span>
                        <span className="hidden sm:inline">{day}</span>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {SCHOOL_PERIODS.map((period, index) => (
                    <Fragment key={period.id}>
                      {index === RECESS_BEFORE_PERIOD_INDEX && (
                        <tr className="border-b bg-muted/60">
                          <td
                            colSpan={SCHOOL_WEEKDAYS.length + 1}
                            className="p-1 text-center text-muted-foreground"
                          >
                            {RECESS.label}
                          </td>
                        </tr>
                      )}
                      <tr className="border-b last:border-b-0">
                        <td className="p-2 whitespace-nowrap text-muted-foreground">
                          <div className="font-medium text-foreground">{period.label}</div>
                          <div className="hidden sm:block">
                            {period.start}–{period.end}
                          </div>
                        </td>
                        {SCHOOL_WEEKDAYS.map((day, dayIndex) => (
                          <td key={day} className="p-1">
                            <AvailabilityCell
                              coordinator={selected}
                              weekday={dayIndex + 1}
                              period={period}
                              fixed={findFixed(dayIndex + 1, period.id)}
                            />
                          </td>
                        ))}
                      </tr>
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>

            <p className="text-xs text-muted-foreground">
              {selected.active
                ? "Si l'horari canvia a mig curs, treu les hores que ja no li van bé: es tanquen les setmanes sense cita, i les que en tenen es queden."
                : "Ja no és a la coordinació: ningú no pot demanar les seves hores. Treu-les, i les setmanes que tinguin cita es quedaran fins que les cancel·lis."}
            </p>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function AvailabilityCell({
  coordinator,
  weekday,
  period,
  fixed,
}: {
  coordinator: AvailabilityCoordinator;
  weekday: number;
  period: SchoolPeriod;
  fixed?: FixedHour;
}) {
  const label = `${slotLabel(weekday, period.id)} amb ${coordinator.name}`;
  const hour = `${everyWeekLabel(weekday, period.id)} amb ${coordinator.name}`;
  const add = useServerAction(addAppointmentAvailability, {
    successMessage: (_input, { weeks }) => `Oberta ${hour} · ${weeks} ${weeks === 1 ? "setmana" : "setmanes"}`,
  });
  const remove = useServerAction(removeAppointmentAvailability, {
    successMessage: (_input, { closed, kept }) =>
      [
        `Ja no és fixa ${hour}`,
        closed > 0 && `${closed} ${closed === 1 ? "hora tancada" : "hores tancades"}`,
        kept.length === 1 && `es manté 1 cita (${kept[0]}): cancel·la-la a la graella si cal`,
        kept.length > 1 && `es mantenen ${kept.length} cites (${dayList(kept)}): cancel·la-les a la graella si cal`,
      ]
        .filter(Boolean)
        .join(" · "),
  });

  if (!fixed) {
    return (
      <button
        type="button"
        aria-label={`Fes fixa: ${label}`}
        disabled={add.isPending || !coordinator.active}
        onClick={() => add.run({ coordinatorId: coordinator.id, weekday, periodId: period.id })}
        className="flex h-8 w-full items-center justify-center rounded-md border border-dashed text-muted-foreground transition-colors hover:border-primary hover:bg-primary/5 hover:text-foreground disabled:opacity-50"
      >
        <PlusIcon className="size-3.5 sm:hidden" />
        <span className="hidden sm:inline">Afegeix</span>
      </button>
    );
  }

  return (
    <AlertDialog>
      <AlertDialogTrigger
        render={
          <button
            type="button"
            aria-label={`Treu l'hora fixa: ${label}`}
            disabled={remove.isPending}
            className="flex h-8 w-full items-center justify-center rounded-md border border-primary/40 bg-primary/15 font-medium transition-colors hover:bg-primary/25 disabled:opacity-50"
          />
        }
      >
        <CheckIcon className="size-3.5 sm:hidden" />
        <span className="hidden truncate px-1 sm:inline">Cada setmana</span>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Treure {hour}?</AlertDialogTitle>
          <AlertDialogDescription>
            Es tancaran les setmanes que queden sense cita. Les que ja en tenen es queden: en acabar
            veuràs quines són, per si les has de cancel·lar.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel·la</AlertDialogCancel>
          <AlertDialogAction disabled={remove.isPending} onClick={() => remove.run({ id: fixed.id })}>
            Treu-la
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
