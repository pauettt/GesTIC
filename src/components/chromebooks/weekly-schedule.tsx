import { Fragment } from "react";
import type { Route } from "next";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";

import {
  addDays,
  formatDayDate,
  formatShortDate,
  formatTime,
  madridDateKey,
  toDateParam,
  zonedDateTime,
} from "@/lib/date";
import { occupies, type DeviceBooking, type MissingDevice } from "@/lib/device-reservations";
import { holidayOn, type Holiday } from "@/lib/holidays";
import {
  bookingOpensOn,
  breakBefore,
  isPastPeriod,
  lastBookableDayKey,
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
  holidays,
  currentUserId,
  isAdmin,
}: {
  cartId: string;
  weekStart: Date;
  reservations: Reservation[];
  /** Les reserves obertes d'equips sols del carro: aquelles hores hi faltaran. */
  deviceBookings: (DeviceBooking & MissingDevice)[];
  /** Els dies festius no es poden reservar. Les reserves que ja hi ha es veuen igual, per poder-les anul·lar. */
  holidays: Holiday[];
  currentUserId: string;
  isAdmin: boolean;
}) {
  const now = new Date();
  const days = SCHOOL_WEEKDAYS.map((label, index) => {
    const date = addDays(weekStart, index);
    return { label, date, holiday: holidayOn(madridDateKey(date), holidays) };
  });
  const prevWeek = toDateParam(addDays(weekStart, -7));
  const nextWeek = toDateParam(addDays(weekStart, 7));
  const rangeLabel = `${formatShortDate(weekStart)} – ${formatShortDate(days[4].date)}`;
  // El professorat només reserva aquesta setmana i la que ve; més enllà, la
  // graella s'ensenya igual però no s'hi pot clicar. El servidor també ho para.
  const locked = !isAdmin && toDateParam(weekStart) > lastBookableDayKey(now);

  function findReservation(dayKey: string, periodStart: string) {
    return reservations.find(
      (reservation) =>
        madridDateKey(reservation.startDate) === dayKey && formatTime(reservation.startDate) === periodStart,
    );
  }

  const canCancel = (reservation: Reservation | undefined) =>
    Boolean(reservation && (isAdmin || reservation.userId === currentUserId));

  /** Quins equips no seran al carro en aquesta sessió perquè algú els té reservats a part, i qui. */
  function devicesOut(dayKey: string, period: { start: string; end: string }): MissingDevice[] {
    const start = zonedDateTime(dayKey, period.start);
    const end = zonedDateTime(dayKey, period.end);
    return deviceBookings
      .filter((booking) => occupies(booking, start, end, now))
      .map(({ assetTag, who }) => ({ assetTag, who }));
  }

  const scheduleDays: ScheduleDay[] = days.map((day, index) => {
    const dayKey = madridDateKey(day.date);
    return {
      dayKey,
      label: day.label,
      shortLabel: SCHOOL_WEEKDAYS_SHORT[index],
      dayOfMonth: Number(dayKey.split("-")[2]),
      holiday: day.holiday?.name ?? null,
      slots: SCHOOL_PERIODS.map((period) => {
        const reservation = findReservation(dayKey, period.start);
        const isPast = isPastPeriod(zonedDateTime(dayKey, period.end), now);
        // De les sessions passades ja no cal saber-ho: no es poden planificar.
        const out = isPast ? [] : devicesOut(dayKey, period);
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
        if (isPast) return { kind: "past" as const };
        if (day.holiday) return { kind: "holiday" as const };
        return locked ? { kind: "locked" as const } : { kind: "free" as const, devicesOut: out };
      }),
    };
  });
  // Al mòbil s'obre el dia d'avui si és d'aquesta setmana; si no, el primer que encara té sessions.
  const todayKey = madridDateKey(new Date());
  const initialDay =
    scheduleDays.find((day) => day.dayKey === todayKey) ??
    scheduleDays.find((day) => day.slots.some((slot) => slot.kind === "free" || slot.kind === "reserved")) ??
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

      {locked && (
        <p className="rounded-lg border bg-muted/30 px-3 py-2 text-sm text-muted-foreground">
          Encara no es pot reservar: només aquesta setmana i la que ve. S&apos;obre el{" "}
          {formatDayDate(bookingOpensOn(weekStart))}.
        </p>
      )}

      <div className="md:hidden">
        <DaySchedule
          // Canviar de setmana torna a obrir el dia que toca, sense sessions triades.
          key={toDateParam(weekStart)}
          cartId={cartId}
          days={scheduleDays}
          periods={SCHOOL_PERIODS}
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
                  {day.holiday && (
                    <span className="block truncate text-xs font-normal text-muted-foreground">
                      Festiu · {day.holiday.name}
                    </span>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {SCHOOL_PERIODS.map((period) => {
              const pause = breakBefore(period.id);
              return (
                <Fragment key={period.id}>
                  {pause && (
                    <tr key="break" className="border-b bg-muted/60">
                      <td colSpan={days.length + 1} className="p-1.5 text-center font-medium text-muted-foreground">
                        {pause.label} · {pause.start}–{pause.end}
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
                            locked={locked}
                            holiday={Boolean(day.holiday)}
                            devicesOut={isPast ? [] : devicesOut(dayKey, period)}
                          />
                        </td>
                      );
                    })}
                  </tr>
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
