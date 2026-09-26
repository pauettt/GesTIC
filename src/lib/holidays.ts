import { formatShortDate, zonedDateTime } from "@/lib/date";

/**
 * Festius i vacances del calendari escolar (`SchoolHoliday`): les regles, sense
 * base de dades, perquè també les facin servir els components del navegador.
 * Les dates són "YYYY-MM-DD" i `endDate` és l'últim dia festiu, inclòs.
 */
export type Holiday = { id: string; name: string; startDate: string; endDate: string };

/** El més llarg que es pot entrar d'un cop: prou per a Nadal, i un any mal escrit no s'endú el curs. */
export const MAX_HOLIDAY_DAYS = 31;

/** El festiu que inclou aquest dia, si n'hi ha. */
export function holidayOn(dateKey: string, holidays: readonly Holiday[]): Holiday | undefined {
  return holidays.find((holiday) => holiday.startDate <= dateKey && dateKey <= holiday.endDate);
}

/** Quants dies té, comptant el primer i l'últim. */
export function holidayLength(startDate: string, endDate: string): number {
  const toTime = (dateKey: string) => new Date(`${dateKey}T12:00:00Z`).getTime();
  return Math.round((toTime(endDate) - toTime(startDate)) / 86_400_000) + 1;
}

/**
 * De quan a quan va, en hores d'Espanya: des de les 00:00 del primer dia fins a
 * les 00:00 de l'endemà de l'últim, sense incloure-les.
 */
export function holidayBounds(holiday: Pick<Holiday, "startDate" | "endDate">): { from: Date; to: Date } {
  const [year, month, day] = holiday.endDate.split("-").map(Number);
  const dayAfter = new Date(Date.UTC(year, month - 1, day + 1, 12)).toISOString().slice(0, 10);
  return { from: zonedDateTime(holiday.startDate, "00:00"), to: zonedDateTime(dayAfter, "00:00") };
}

/** «12 d'oct.» o «del 23 de des. al 7 de gen.». */
export function holidayRangeLabel(holiday: Pick<Holiday, "startDate" | "endDate">): string {
  const day = (dateKey: string) => formatShortDate(zonedDateTime(dateKey, "12:00"));
  return holiday.startDate === holiday.endDate
    ? day(holiday.startDate)
    : `del ${day(holiday.startDate)} al ${day(holiday.endDate)}`;
}

/** El motiu per no reservar un dia festiu, per ensenyar-lo tal qual. */
export function holidayRefusal(holiday: Holiday): string {
  return `Aquest dia és festiu (${holiday.name}): no hi ha classe.`;
}
