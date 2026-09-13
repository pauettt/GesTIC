import { Fragment } from "react";
import type { Route } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { addDays, formatShortDate, formatTime, madridDateKey, toDateParam, zonedDateTime } from "@/lib/date";
import {
  isPastPeriod,
  RECESS,
  RECESS_BEFORE_PERIOD_INDEX,
  SCHOOL_PERIODS,
  SCHOOL_WEEKDAYS,
} from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/button-link";
import { SlotCell, type SlotCellSlot } from "@/components/appointments/slot-cell";

type Slot = SlotCellSlot & { startDate: Date };

/**
 * Graella setmanal de les hores del centre. És la mateixa forma que l'horari
 * d'ocupació dels carros, a propòsit: el professorat ja hi reserva Chromebooks
 * i no ha d'aprendre una segona manera de mirar la setmana.
 */
export function AppointmentWeek({
  weekStart,
  slots,
  canManage,
}: {
  weekStart: Date;
  slots: Slot[];
  canManage: boolean;
}) {
  const days = SCHOOL_WEEKDAYS.map((label, index) => ({ label, date: addDays(weekStart, index) }));
  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));
  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(days[4].date)}`;

  function findSlot(dayKey: string, periodStart: string) {
    return slots.find(
      (slot) => madridDateKey(slot.startDate) === dayKey && formatTime(slot.startDate) === periodStart,
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <ButtonLink variant="outline" size="sm" href={`/cites?week=${prevWeek}` as Route}>
          <ChevronLeftIcon className="size-4" />
          Setmana anterior
        </ButtonLink>
        <p className="text-sm font-medium">{rangeLabel}</p>
        <ButtonLink variant="outline" size="sm" href={`/cites?week=${nextWeek}` as Route}>
          Setmana següent
          <ChevronRightIcon className="size-4" />
        </ButtonLink>
      </div>

      <div className="overflow-x-auto rounded-lg border bg-background">
        <table className="w-full min-w-[720px] border-collapse text-xs">
          <thead>
            <tr className="border-b bg-muted/40">
              <th className="w-28 p-2 text-left font-medium text-muted-foreground">Sessió</th>
              {days.map((day) => (
                <th key={day.label} className="p-2 text-center font-medium">
                  {day.label}{" "}
                  <span className="text-muted-foreground">
                    {Number(madridDateKey(day.date).split("-")[2])}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHOOL_PERIODS.map((period, index) => (
              <Fragment key={period.id}>
                {index === RECESS_BEFORE_PERIOD_INDEX && (
                  <tr key="recess" className="border-b bg-muted/60">
                    <td colSpan={days.length + 1} className="p-1.5 text-center font-medium text-muted-foreground">
                      {RECESS.label} · {RECESS.start}–{RECESS.end}
                    </td>
                  </tr>
                )}
                <tr key={period.id} className="border-b last:border-b-0">
                  <td className="p-2 align-top whitespace-nowrap text-muted-foreground">
                    <div className="font-medium text-foreground">{period.label}</div>
                    {period.start}–{period.end}
                  </td>
                  {days.map((day) => {
                    const dayKey = madridDateKey(day.date);
                    const slot = findSlot(dayKey, period.start);
                    return (
                      <td key={day.label} className="p-1 align-top">
                        <SlotCell
                          dayKey={dayKey}
                          dayLabel={day.label}
                          period={period}
                          slot={slot}
                          canManage={canManage}
                          isPast={isPastPeriod(zonedDateTime(dayKey, period.end))}
                        />
                      </td>
                    );
                  })}
                </tr>
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
