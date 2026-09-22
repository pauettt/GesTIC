import type { ChromebookStatus, Prisma } from "@prisma/client";

import { formatTime, isSameDay, SCHOOL_TIME_ZONE, zonedDateTime } from "@/lib/date";
import { SCHOOL_PERIODS, type SchoolPeriod } from "@/lib/schedule";

/**
 * Reserves d'un sol equip d'un carro (`DeviceReservation`). Aquí hi ha les
 * regles, sense base de dades, perquè les facin servir igual les accions, les
 * pàgines i el cron de recordatoris.
 */

/** Una reserva d'equip oberta (CONFIRMADA): les cancel·lades i les tornades ja no ocupen res. */
export type DeviceBooking = { startDate: Date; endDate: Date };

/** Ja ha començat: l'equip és a les mans de qui l'ha reservat fins que el torni. */
export function isHeld(booking: DeviceBooking, now: Date = new Date()) {
  return booking.startDate <= now;
}

/** L'hora de tornar-lo ja ha passat i encara no consta que hagi tornat. */
export function isOverdue(booking: { endDate: Date }, now: Date = new Date()) {
  return booking.endDate <= now;
}

/**
 * Si una reserva oberta ocupa l'equip entre `start` i `end`. Fins a l'hora
 * prevista, com qualsevol reserva; però si ja ha passat i no l'ha tornat,
 * l'ocupa fins que el torni, perquè no se sap quan tornarà al carro.
 */
export function occupies(booking: DeviceBooking, start: Date, end: Date, now: Date = new Date()) {
  return booking.startDate < end && (booking.endDate > start || isOverdue(booking, now));
}

/** `occupies`, per a Prisma: les reserves d'equip obertes que l'ocupen entre `start` i `end`. */
export function occupyingWhere(start: Date, end: Date, now: Date): Prisma.DeviceReservationWhereInput {
  return {
    status: "CONFIRMADA",
    startDate: { lt: end },
    OR: [{ endDate: { gt: start } }, { endDate: { lte: now } }],
  };
}

/** Si ara es pot agafar del carro: funciona i no el té ningú per una reserva. */
export function isFreeNow(
  device: { status: ChromebookStatus; reservations: DeviceBooking[] },
  now: Date = new Date(),
) {
  return device.status === "DISPONIBLE" && !device.reservations.some((booking) => isHeld(booking, now));
}

/** Si serà al carro entre `start` i `end`: funciona i cap reserva no l'ocupa. */
export function isFreeDuring(
  device: { status: ChromebookStatus; reservations: DeviceBooking[] },
  start: Date,
  end: Date,
  now: Date = new Date(),
) {
  return device.status === "DISPONIBLE" && !device.reservations.some((booking) => occupies(booking, start, end, now));
}

/**
 * Les sessions d'una reserva, de la primera a l'última: quan comença i quan
 * s'ha de tornar. Si n'hi ha d'entremig que no s'han triat, també hi compten:
 * l'equip no torna al carro entre una i l'altra. `null` si l'ordre no té sentit.
 */
export function sessionSpan(dateKey: string, fromPeriodId: number, toPeriodId: number) {
  const fromIndex = SCHOOL_PERIODS.findIndex((period) => period.id === fromPeriodId);
  const toIndex = SCHOOL_PERIODS.findIndex((period) => period.id === toPeriodId);
  if (fromIndex < 0 || toIndex < 0 || toIndex < fromIndex) return null;
  const first = SCHOOL_PERIODS[fromIndex];
  const last = SCHOOL_PERIODS[toIndex];
  return {
    first,
    last,
    startDate: zonedDateTime(dateKey, first.start),
    endDate: zonedDateTime(dateKey, last.end),
  };
}

/** «3a hora», o «3a a 5a hora» si n'agafa més d'una. */
export function spanLabel(first: SchoolPeriod, last: SchoolPeriod) {
  return first.id === last.id ? first.label : `${first.label.replace(" hora", "")} a ${last.label}`;
}

/** Les sessions d'una reserva desada, per dir-les com les ha triat qui l'ha fet. */
export function bookingSpanLabel(booking: DeviceBooking) {
  const first = SCHOOL_PERIODS.find((period) => period.start === formatTime(booking.startDate));
  const last = SCHOOL_PERIODS.find((period) => period.end === formatTime(booking.endDate));
  if (!first || !last) return `${formatTime(booking.startDate)}–${formatTime(booking.endDate)}`;
  return `${spanLabel(first, last)} (${first.start}–${last.end})`;
}

/** A la graella del carro: «Falta 1 equip», «Falten 3 equips». Buit si no en falta cap. */
export function missingDevicesLabel(count: number) {
  if (count <= 0) return "";
  return count === 1 ? "Falta 1 equip" : `Falten ${count} equips`;
}

/** Qui té l'equip ara mateix per una reserva, i fins quan l'havia de tenir. */
export type DeviceHolder = { who: string; endDate: Date };

/** L'estat que veu qui vol fer servir l'equip: mentre el té algú, no hi és. */
export function shownStatus(status: ChromebookStatus, holder: DeviceHolder | null): ChromebookStatus {
  return status === "DISPONIBLE" && holder ? "NO_DISPONIBLE" : status;
}

/** «dilluns 21 de setembre», a l'hora del centre. */
export function dayLabel(date: Date) {
  return date
    .toLocaleDateString("ca-ES", { weekday: "long", day: "numeric", month: "long", timeZone: SCHOOL_TIME_ZONE })
    .replace(",", "");
}

/** Quan l'havia de tornar, dit des d'avui: «a les 10:45», o «dilluns 21 de setembre a les 10:45». */
export function dueLabel(endDate: Date, now: Date = new Date()) {
  const time = `a les ${formatTime(endDate)}`;
  return isSameDay(endDate, now) ? time : `${dayLabel(endDate)} ${time}`;
}

/** El motiu que surt a l'equip mentre el té algú: «Reserva · Anna Puig, fins a les 10:45». */
export function holderReason(holder: DeviceHolder, now: Date = new Date()) {
  return isOverdue(holder, now)
    ? `Reserva · ${holder.who}, que l'havia de tornar ${dueLabel(holder.endDate, now)}`
    : `Reserva · ${holder.who}, fins ${dueLabel(holder.endDate, now)}`;
}

/**
 * Un equip tal com l'ha de veure qui el vol fer servir: si ara el té algú per
 * una reserva, no disponible i amb el seu nom com a motiu. Si ja no funcionava
 * per un altre motiu, mana aquell.
 */
export function withHolder<T extends { status: ChromebookStatus; unavailableReason: string | null }>(
  device: T,
  holder: DeviceHolder | null,
  now: Date = new Date(),
): T {
  if (!holder || device.status !== "DISPONIBLE") return device;
  return { ...device, status: "NO_DISPONIBLE", unavailableReason: holderReason(holder, now) };
}

/**
 * Les reserves obertes d'un equip, per a l'`include` d'un Chromebook: el que ha
 * de saber qui el vol fer servir. Surt el nom de qui l'ha reservat, com a la
 * graella del carro, i res més de la seva fila d'usuari.
 */
export const openDeviceReservations = {
  where: { status: "CONFIRMADA" as const },
  orderBy: { startDate: "asc" as const },
  select: {
    id: true,
    userId: true,
    startDate: true,
    endDate: true,
    purpose: true,
    user: { select: { name: true, email: true } },
  },
} satisfies Prisma.DeviceReservationFindManyArgs;

type OpenReservationRow = {
  id: string;
  userId: string;
  startDate: Date;
  endDate: Date;
  purpose: string | null;
  user: { name: string | null; email: string };
};

/** Una reserva oberta d'un equip, tal com la veu qui mira el carro. */
export type DeviceReservationView = {
  id: string;
  who: string;
  startDate: Date;
  endDate: Date;
  purpose: string | null;
  /** Ja ha començat: l'equip és a les mans de qui l'ha reservat. */
  held: boolean;
  /** L'havia de tornar i encara no ho ha fet. */
  overdue: boolean;
  mine: boolean;
  /** Qui l'ha feta o la coordinació: la pot cancel·lar o marcar com a tornada. */
  canManage: boolean;
};

export function reservationView(
  row: OpenReservationRow,
  viewer: { id: string; admin: boolean },
  now: Date = new Date(),
): DeviceReservationView {
  return {
    id: row.id,
    who: row.user.name ?? row.user.email,
    startDate: row.startDate,
    endDate: row.endDate,
    purpose: row.purpose,
    held: isHeld(row, now),
    overdue: isHeld(row, now) && isOverdue(row, now),
    mine: row.userId === viewer.id,
    canManage: viewer.admin || row.userId === viewer.id,
  };
}

export function reservationViews(
  rows: OpenReservationRow[],
  viewer: { id: string; admin: boolean },
  now: Date = new Date(),
): DeviceReservationView[] {
  return rows.map((row) => reservationView(row, viewer, now));
}

/**
 * Si té sentit oferir de reservar-lo: funciona i no hi ha ningú que l'hagués
 * d'haver tornat. Mentre no torni, no es pot reservar per a cap altra hora.
 */
export function canBeReserved(status: ChromebookStatus, reservations: { overdue: boolean }[]) {
  return status === "DISPONIBLE" && !reservations.some((reservation) => reservation.overdue);
}

/** Qui té l'equip ara mateix, si algú el té: la reserva oberta que ja ha començat. */
export function currentHolder(rows: OpenReservationRow[], now: Date = new Date()): DeviceHolder | null {
  const held = rows.find((row) => isHeld(row, now));
  return held ? { who: held.user.name ?? held.user.email, endDate: held.endDate } : null;
}
