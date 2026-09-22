import { Fragment } from "react";
import type { Route } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import { addDays, formatShortDate, formatTime, madridDateKey, toDateParam, zonedDateTime } from "@/lib/date";
import { occupies, type DeviceBooking } from "@/lib/device-reservations";
import {
  isPastPeriod,
  RECESS,
  RECESS_BEFORE_PERIOD_INDEX,
  SCHOOL_PERIODS,
  SCHOOL_WEEKDAYS,
  SCHOOL_WEEKDAYS_SHORT,
} from "@/lib/schedule";
import { ButtonLink } from "@/components/ui/button-link";
import { DaySchedule, type ScheduleDay } from "@/components/chromebooks/day-schedule";
import { ReservationCell } from "@/components/chromebooks/reservation-cell";

type Reservation = {
  id: string;
  startDate: Date;
  endDate: Date;
  purpose: string | null;
  userId: string;
  /** La d'una setmana d'una reserva fixa. */
  recurringId: string | null;
  user: { name: string | null; email: string };
};

export function WeeklySchedule({
  cartId,
  weekStart,
  reservations,
  deviceBookings,
  currentUserId,
  isAdmin,
}: {
  cartId: string;
  weekStart: Date;
  reservations: Reservation[];
  /** Les reserves obertes d'equips sols del carro: aquelles hores hi faltaran. */
  deviceBookings: DeviceBooking[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const now = new Date();
  const days = SCHOOL_WEEKDAYS.map((label, index) => ({ label, date: addDays(weekStart, index) }));
  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));
  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(days[4].date)}`;

  function findReservation(dayKey: string, periodStart: string) {
    return reservations.find(
      (reservation) =>
        madridDateKey(reservation.startDate) === dayKey && formatTime(reservation.startDate) === periodStart,
    );
  }

  const canCancel = (reservation: Reservation | undefined) =>
    Boolean(reservation && (isAdmin || reservation.userId === currentUserId));

  /** Quants equips no seran al carro en aquesta sessió perquè algú els té reservats a part. */
  function devicesOut(dayKey: string, period: { start: string; end: string }) {
    const start = zonedDateTime(dayKey, period.start);
    const end = zonedDateTime(dayKey, period.end);
    return deviceBookings.filter((booking) => occupies(booking, start, end, now)).length;
  }

  const scheduleDays: ScheduleDay[] = days.map((day, index) => {
    const dayKey = madridDateKey(day.date);
    return {
      dayKey,
      label: day.label,
      shortLabel: SCHOOL_WEEKDAYS_SHORT[index],
      dayOfMonth: Number(dayKey.split("-")[2]),
      slots: SCHOOL_PERIODS.map((period) => {
        const reservation = findReservation(dayKey, period.start);
        const isPast = isPastPeriod(zonedDateTime(dayKey, period.end), now);
        // De les sessions passades ja no cal saber-ho: no es poden planificar.
        const out = isPast ? 0 : devicesOut(dayKey, period);
        if (reservation) {
          return {
            kind: "reserved" as const,
            id: reservation.id,
            who: reservation.user.name ?? reservation.user.email,
            purpose: reservation.purpose,
            fixed: reservation.recurringId !== null,
            canCancel: canCancel(reservation),
            devicesOut: out,
          };
        }
        return isPast ? { kind: "past" as const } : { kind: "free" as const, devicesOut: out };
      }),
    };
  });
  // Al mòbil s'obre el dia d'avui si és d'aquesta setmana; si no, el primer que encara té sessions.
  const todayKey = madridDateKey(new Date());
  const initialDay =
    scheduleDays.find((day) => day.dayKey === todayKey) ??
    scheduleDays.find((day) => day.slots.some((slot) => slot.kind !== "past")) ??
    scheduleDays[0];

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-2">
        <ButtonLink
          variant="outline"
          size="sm"
          href={`/chromebooks/${cartId}?week=${prevWeek}` as Route}
        >
          <ChevronLeftIcon className="size-4" />
          <span className="sr-only sm:not-sr-only">Setmana anterior</span>
        </ButtonLink>
        <p className="text-sm font-medium">{rangeLabel}</p>
        <ButtonLink
          variant="outline"
          size="sm"
          href={`/chromebooks/${cartId}?week=${nextWeek}` as Route}
        >
          <span className="sr-only sm:not-sr-only">Setmana següent</span>
          <ChevronRightIcon className="size-4" />
        </ButtonLink>
      </div>

      <div className="md:hidden">
        <DaySchedule
          // Canviar de setmana torna a obrir el dia que toca, sense sessions triades.
          key={toDateParam(weekStart)}
          cartId={cartId}
          days={scheduleDays}
          periods={SCHOOL_PERIODS}
          recessBeforeIndex={RECESS_BEFORE_PERIOD_INDEX}
          recessLabel={`${RECESS.label} · ${RECESS.start}–${RECESS.end}`}
          initialDayKey={initialDay.dayKey}
        />
      </div>

      <div className="hidden overflow-x-auto rounded-lg border bg-background md:block">
        {/* Columnes fixes: el motiu d'una reserva es talla en comptes d'eixamplar el dia. */}
        <table className="w-full min-w-[720px] table-fixed border-collapse text-xs">
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
                    const reservation = findReservation(dayKey, period.start);
                    const isPast = isPastPeriod(zonedDateTime(dayKey, period.end), now);
                    return (
                      <td key={day.label} className="p-1 align-top">
                        <ReservationCell
                          cartId={cartId}
                          dayKey={dayKey}
                          dayLabel={day.label}
                          period={period}
                          reservation={reservation}
                          canCancel={canCancel(reservation)}
                          isPast={isPast}
                          devicesOut={isPast ? 0 : devicesOut(dayKey, period)}
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
