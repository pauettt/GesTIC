import { addDays, madridDateKey, startOfWeek, zonedDateTime } from "@/lib/date";

export type SchoolPeriod = {
  id: number;
  label: string;
  start: string;
  end: string;
};

// Horari del centre: dilluns a divendres, 8:00-14:55, classes de 55 minuts,
// pati de 30 minuts (10:45-11:15).
export const SCHOOL_PERIODS: SchoolPeriod[] = [
  { id: 1, label: "1a hora", start: "08:00", end: "08:55" },
  { id: 2, label: "2a hora", start: "08:55", end: "09:50" },
  { id: 3, label: "3a hora", start: "09:50", end: "10:45" },
  { id: 4, label: "4a hora", start: "11:15", end: "12:10" },
  { id: 5, label: "5a hora", start: "12:10", end: "13:05" },
  { id: 6, label: "6a hora", start: "13:05", end: "14:00" },
  { id: 7, label: "7a hora", start: "14:00", end: "14:55" },
];

// Índex (basat en 0) de SCHOOL_PERIODS abans del qual s'insereix el pati a la graella.
export const RECESS_BEFORE_PERIOD_INDEX = 3;

export const RECESS = { label: "Pati", start: "10:45", end: "11:15" };

export const SCHOOL_WEEKDAYS = ["Dilluns", "Dimarts", "Dimecres", "Dijous", "Divendres"];

/**
 * Una franja es considera passada quan ja ha acabat, no quan ha començat: si un
 * professor necessita el carro a mitja classe, ha de poder reservar la sessió
 * en curs.
 */
export function isPastPeriod(periodEnd: Date, now: Date = new Date()) {
  return periodEnd < now;
}

export function getPeriodById(id: number): SchoolPeriod | undefined {
  return SCHOOL_PERIODS.find((period) => period.id === id);
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
 * divendres a les tres— s'obre damunt la següent. Si no, el primer que veu qui
 * hi entra és una graella sencera apagada on no es pot clicar res, i sembla que
 * l'aplicació estigui trencada o que li faltin permisos.
 */
export function defaultWeekStart(now: Date = new Date()): Date {
  const weekStart = startOfWeek(now);
  const friday = addDays(weekStart, 4);
  const lastPeriod = SCHOOL_PERIODS[SCHOOL_PERIODS.length - 1];
  const weekEnd = zonedDateTime(madridDateKey(friday), lastPeriod.end);
  return isPastPeriod(weekEnd, now) ? addDays(weekStart, 7) : weekStart;
}
