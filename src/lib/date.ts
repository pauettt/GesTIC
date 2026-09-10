// Totes les dates es guarden en UTC (com és habitual) però el centre opera sempre
// en hora d'Espanya peninsular/Balears. Com que el servidor de producció (Vercel)
// corre en UTC, cal convertir explícitament en comptes de confiar en la zona
// horària del procés — si no, les hores introduïdes pel professorat es
// guardarien/mostrarien desplaçades 1-2 hores.
export const SCHOOL_TIME_ZONE = "Europe/Madrid";

function dateTimeParts(date: Date, timeZone: string) {
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    hourCycle: "h23",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  const parts: Record<string, string> = {};
  for (const part of formatter.formatToParts(date)) {
    parts[part.type] = part.value;
  }
  return parts;
}

/** Retorna "YYYY-MM-DD" per a la data, interpretada en la zona horària del centre. */
export function madridDateKey(date: Date): string {
  const parts = dateTimeParts(date, SCHOOL_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

/**
 * Combina una data ("YYYY-MM-DD") i una hora ("HH:mm"), interpretades a la zona
 * horària del centre, i retorna l'instant UTC corresponent — independentment de
 * la zona horària del servidor que executa el codi.
 */
export function zonedDateTime(dateStr: string, timeStr: string): Date {
  const naiveUtc = new Date(`${dateStr}T${timeStr}:00.000Z`);
  const shown = dateTimeParts(naiveUtc, SCHOOL_TIME_ZONE);
  const shownAsUtc = Date.UTC(
    Number(shown.year),
    Number(shown.month) - 1,
    Number(shown.day),
    Number(shown.hour),
    Number(shown.minute),
    Number(shown.second),
  );
  const offset = shownAsUtc - naiveUtc.getTime();
  return new Date(naiveUtc.getTime() - offset);
}

/** Igual que `zonedDateTime` per a un valor d'`<input type="datetime-local">` ("YYYY-MM-DDTHH:mm"). */
export function zonedDateTimeFromLocal(datetimeLocal: string): Date {
  const [dateStr, timeStr] = datetimeLocal.split("T");
  return zonedDateTime(dateStr, timeStr ?? "00:00");
}

/** Instant UTC corresponent a la mitjanit (hora del centre) del dilluns de la setmana de `date`. */
export function startOfWeek(date: Date): Date {
  const key = madridDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12));
  const dayOfWeek = utcNoon.getUTCDay();
  const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const mondayNoon = new Date(utcNoon.getTime() + mondayOffset * 86_400_000);
  return zonedDateTime(madridDateKey(mondayNoon), "00:00");
}

/** Desplaça una mitjanit (hora del centre) un nombre de dies, mantenint-la a mitjanit. */
export function addDays(date: Date, days: number): Date {
  const key = madridDateKey(date);
  const [y, m, d] = key.split("-").map(Number);
  const shiftedNoon = new Date(Date.UTC(y, m - 1, d + days, 12));
  return zonedDateTime(madridDateKey(shiftedNoon), "00:00");
}

export function toDateParam(date: Date): string {
  return madridDateKey(date);
}

export function isSameDay(a: Date, b: Date): boolean {
  return madridDateKey(a) === madridDateKey(b);
}

export function formatTime(date: Date): string {
  return date.toLocaleTimeString("ca-ES", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString("ca-ES", { timeZone: SCHOOL_TIME_ZONE });
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString("ca-ES", {
    day: "numeric",
    month: "short",
    timeZone: SCHOOL_TIME_ZONE,
  });
}

export function formatDateTime(date: Date): string {
  return date.toLocaleString("ca-ES", { timeZone: SCHOOL_TIME_ZONE });
}

/** Format "YYYY-MM-DDTHH:mm" (hora del centre) apte per a `<input type="datetime-local">`. */
export function toDateTimeLocalValue(date: Date): string {
  const parts = dateTimeParts(date, SCHOOL_TIME_ZONE);
  return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}

export function formatDateTimeFull(date: Date): string {
  return date.toLocaleString("ca-ES", {
    dateStyle: "full",
    timeStyle: "short",
    timeZone: SCHOOL_TIME_ZONE,
  });
}
