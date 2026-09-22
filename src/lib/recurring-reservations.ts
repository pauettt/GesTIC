import { formatShortDate, madridDateKey, SCHOOL_TIME_ZONE, schoolYearOf, zonedDateTime } from "@/lib/date";
import { getPeriodById, isPastPeriod, SCHOOL_WEEKDAYS } from "@/lib/schedule";

/**
 * Reserves fixes de carros (`RecurringReservation`): el mateix dia i la mateixa
 * sessió cada setmana d'un curs, fins al 30 de juny. Aquí hi ha les regles, sense
 * base de dades.
 */

/** Del 1 de setembre al 30 de juny del curs «2026-2027», com a "YYYY-MM-DD". */
export function courseDays(schoolYear: string) {
  const startYear = Number(schoolYear.slice(0, 4));
  return { firstDay: `${startYear}-09-01`, lastDay: `${startYear + 1}-06-30` };
}

/**
 * El curs al qual va una reserva fixa demanada ara. Fins al 30 de juny, el que
 * està en marxa; al juliol i a l'agost, el següent, que comença l'1 de setembre.
 * L'any surt de la data: cada curs funciona sol, sense tocar res.
 */
export function recurringCourse(now: Date = new Date()) {
  let startYear = Number(schoolYearOf(now).slice(0, 4));
  if (madridDateKey(now) > courseDays(`${startYear}-${startYear + 1}`).lastDay) startYear += 1;
  const schoolYear = `${startYear}-${startYear + 1}`;
  return { schoolYear, ...courseDays(schoolYear) };
}

/** Un "YYYY-MM-DD" desplaçat uns dies, sense passar per la zona horària del servidor. */
function shiftKey(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day + days, 12)).toISOString().slice(0, 10);
}

/** 1 = dilluns … 7 = diumenge. */
function isoWeekday(dateKey: string) {
  const [year, month, day] = dateKey.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay() || 7;
}

/**
 * Les setmanes que queden d'una reserva fixa: cada `weekday` (1 = dilluns) del
 * curs, a la sessió `periodId`, de l'1 de setembre —o d'avui, si ja ha
 * començat— al 30 de juny. Les sessions que ja han acabat no hi són.
 */
export function occurrences(weekday: number, periodId: number, schoolYear: string, now: Date = new Date()) {
  const period = getPeriodById(periodId);
  if (!period || weekday < 1 || weekday > 5) return [];
  const { firstDay, lastDay } = courseDays(schoolYear);
  const today = madridDateKey(now);
  const from = firstDay > today ? firstDay : today;

  const result: { dateKey: string; startDate: Date; endDate: Date }[] = [];
  for (
    let dateKey = shiftKey(from, (weekday - isoWeekday(from) + 7) % 7);
    dateKey <= lastDay;
    dateKey = shiftKey(dateKey, 7)
  ) {
    const endDate = zonedDateTime(dateKey, period.end);
    if (isPastPeriod(endDate, now)) continue;
    result.push({ dateKey, startDate: zonedDateTime(dateKey, period.start), endDate });
  }
  return result;
}

/** «Dimarts · 3a hora (09:50–10:45)». */
export function slotLabel(weekday: number, periodId: number) {
  const period = getPeriodById(periodId);
  const day = SCHOOL_WEEKDAYS[weekday - 1] ?? "?";
  return period ? `${day} · ${period.label} (${period.start}–${period.end})` : day;
}

/** «cada dimarts a 3a hora»: per a les frases. */
export function everyWeekLabel(weekday: number, periodId: number) {
  const day = (SCHOOL_WEEKDAYS[weekday - 1] ?? "?").toLowerCase();
  return `cada ${day} a ${getPeriodById(periodId)?.label ?? "?"}`;
}

/** «29 de set.», d'un "YYYY-MM-DD". */
export function shortDay(dateKey: string) {
  return formatShortDate(zonedDateTime(dateKey, "12:00"));
}

/** «30 de juny del 2027»: fins quan dura una reserva fixa d'aquest curs. */
export function courseEndLabel(schoolYear: string) {
  return zonedDateTime(courseDays(schoolYear).lastDay, "12:00").toLocaleDateString("ca-ES", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: SCHOOL_TIME_ZONE,
  });
}
