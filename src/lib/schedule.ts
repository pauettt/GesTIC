import { addDays, formatShortDate, madridDateKey, startOfWeek, zonedDateTime } from "@/lib/date";

export type SchoolPeriod = {
  id: number;
  label: string;
  start: string;
  end: string;
};

// Horari del centre, de dilluns a divendres. Al matí, 8:00-14:55, classes de 55
// minuts i pati de 30 minuts (10:45-11:15).
export const MORNING_PERIODS: SchoolPeriod[] = [
  { id: 1, label: "1a hora", start: "08:00", end: "08:55" },
  { id: 2, label: "2a hora", start: "08:55", end: "09:50" },
  { id: 3, label: "3a hora", start: "09:50", end: "10:45" },
  { id: 4, label: "4a hora", start: "11:15", end: "12:10" },
  { id: 5, label: "5a hora", start: "12:10", end: "13:05" },
  { id: 6, label: "6a hora", start: "13:05", end: "14:00" },
  { id: 7, label: "7a hora", start: "14:00", end: "14:55" },
];

// A la vesprada, 15:35-19:15, quatre classes de 55 minuts seguides.
export const AFTERNOON_PERIODS: SchoolPeriod[] = [
  { id: 8, label: "1a de vesprada", start: "15:35", end: "16:30" },
  { id: 9, label: "2a de vesprada", start: "16:30", end: "17:25" },
  { id: 10, label: "3a de vesprada", start: "17:25", end: "18:20" },
  { id: 11, label: "4a de vesprada", start: "18:20", end: "19:15" },
];

/**
 * Totes les sessions del centre, matí i vesprada: les dels carros. L'agenda de
 * cites de la coordinació només és de matí i fa servir `MORNING_PERIODS`.
 */
export const SCHOOL_PERIODS: SchoolPeriod[] = [...MORNING_PERIODS, ...AFTERNOON_PERIODS];

export type SchoolBreak = { label: string; start: string; end: string };

export const RECESS: SchoolBreak = { label: "Pati", start: "10:45", end: "11:15" };

export const LUNCH: SchoolBreak = { label: "Dinar", start: "14:55", end: "15:35" };

/** La pausa que va just abans d'una sessió a les graelles: el pati abans de 4a hora i el dinar abans de la vesprada. */
export function breakBefore(periodId: number): SchoolBreak | undefined {
  if (periodId === MORNING_PERIODS[3].id) return RECESS;
  if (periodId === AFTERNOON_PERIODS[0].id) return LUNCH;
  return undefined;
}

export const SCHOOL_WEEKDAYS = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

/** Les abreviatures de sempre: totes comencen per «Di», i les dues primeres lletres no les distingeixen. */
export const SCHOOL_WEEKDAYS_SHORT = ["Dl", "Dt", "Dc", "Dj", "Dv"];

/**
 * Una franja es considera passada quan ja ha acabat, no quan ha començat: si un
 * professor necessita el carro a mitja classe, ha de poder reservar la sessió
 * en curs.
 */
export function isPastPeriod(periodEnd: Date, now: Date = new Date()) {
  return periodEnd < now;
}

/** `periods`, per buscar-la només entre les d'una part del dia, com les cites, que són de matí. */
export function getPeriodById(id: number, periods: readonly SchoolPeriod[] = SCHOOL_PERIODS): SchoolPeriod | undefined {
  return periods.find((period) => period.id === id);
}

/**
 * Dilluns a divendres, per a una data "YYYY-MM-DD". Les graelles només ensenyen
 * aquests dies, i una acció cridada a mà no n'ha de poder crear cap altre.
 */
export function isSchoolDay(dateKey: string): boolean {
  const [year, month, day] = dateKey.split("-").map(Number);
  const weekday = new Date(Date.UTC(year, month - 1, day, 12)).getUTCDay();
  return weekday >= 1 && weekday <= 5;
}

/**
 * Setmana que ha de sortir per defecte en una graella horària.
 *
 * Si de la setmana en curs ja no en queda cap hora viva —un dissabte, o
 * divendres al vespre— s'obre damunt la següent. Si no, el primer que veu qui
 * hi entra és una graella sencera apagada on no es pot clicar res, i sembla que
 * l'aplicació estigui trencada o que li faltin permisos. Les cites hi passen
 * `MORNING_PERIODS`: la seva graella s'acaba a les tres.
 */
export function defaultWeekStart(now: Date = new Date(), periods: readonly SchoolPeriod[] = SCHOOL_PERIODS): Date {
  const weekStart = startOfWeek(now);
  const friday = addDays(weekStart, 4);
  const lastPeriod = periods[periods.length - 1];
  const weekEnd = zonedDateTime(madridDateKey(friday), lastPeriod.end);
  return isPastPeriod(weekEnd, now) ? addDays(weekStart, 7) : weekStart;
}

/**
 * L'últim dia que es pot reservar un carro o un equip: el divendres de la
 * setmana que ve. Si no, hi ha qui es reserva el curs sencer el primer dia;
 * el que es repeteix cada setmana va per reserva fixa, que la coordinació aprova.
 * Val per a tothom, la coordinació inclosa; només el superadmin no hi té límit.
 */
export function lastBookableDayKey(now: Date = new Date()): string {
  return madridDateKey(addDays(startOfWeek(now), 11));
}

/** El motiu per no deixar reservar aquell dia, o `null` si encara és dins del termini. */
export function bookingHorizonRefusal(dateKey: string, now: Date = new Date()): string | null {
  const last = lastBookableDayKey(now);
  if (dateKey <= last) return null;
  return `Només es pot reservar aquesta setmana i la que ve, fins al ${formatShortDate(zonedDateTime(last, "12:00"))}`;
}

/** El dilluns que s'obre una setmana per reservar: el de la setmana d'abans. */
export function bookingOpensOn(weekStart: Date): Date {
  return addDays(startOfWeek(weekStart), -7);
}
