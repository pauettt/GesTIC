import { RECESS } from "@/lib/schedule";

/** Marge abans de considerar que una clau de carro s'hauria d'haver tornat. */
export const KEY_GRACE_MINUTES = 10;

const numberCollator = new Intl.Collator("ca", { numeric: true, sensitivity: "base" });

/**
 * Ordre de les claus pel número, com al clauer: la 4 abans de la 14. Amb el
 * cercador, qui escriu «4» troba primer la 4.
 */
export function byKeyNumber(a: { number: string }, b: { number: string }) {
  return numberCollator.compare(a.number, b.number);
}

type Slot = { startDate: Date; endDate: Date };

function minutesOf(time: string) {
  const [hours, minutes] = time.split(":").map(Number);
  return hours * 60 + minutes;
}

/**
 * La pausa més llarga entre dues sessions seguides de l'horari és el pati. Una
 * reserva que comença dins d'aquest marge continua el bloc: abans només
 * s'encadenaven les que començaven just quan acabava l'anterior, i qui tenia el
 * carro a 3a i 4a hora sortia com a "Per tornar" en ple pati.
 */
const MAX_GAP_MS = (minutesOf(RECESS.end) - minutesOf(RECESS.start)) * 60_000;

/**
 * Final del bloc de reserves seguides que arrenca a `from`.
 *
 * Un professor que té el carro a 3a i 4a hora no ha de rebre cap avís entre
 * mig: baixa la clau al final de l'última. Per això s'encadenen les reserves
 * consecutives del mateix professor i el mateix carro —les que comencen quan
 * acaba l'anterior o en acabar el pati— i el compte enrere surt del final de
 * l'última.
 */
export function blockEnd(from: Slot, sameDaySlots: Slot[]): Date {
  let end = from.endDate;
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const slot of sameDaySlots) {
      const gap = slot.startDate.getTime() - end.getTime();
      if (gap >= 0 && gap <= MAX_GAP_MS && slot.endDate > end) {
        end = slot.endDate;
        advanced = true;
      }
    }
  }
  return end;
}

/** Instant a partir del qual una clau amb reserva compta com a no tornada. */
export function dueAt(from: Slot, sameDaySlots: Slot[]): Date {
  return new Date(blockEnd(from, sameDaySlots).getTime() + KEY_GRACE_MINUTES * 60_000);
}

type DeskReservation = Slot & {
  id: string;
  cartId: string;
  userId: string;
  keyLoans: { returnedAt: Date | null }[];
};

/**
 * On és una reserva d'avui per al taulell de consergeria:
 * - `pending`: encara s'ha de donar la clau.
 * - `delivered`: la clau és fora.
 * - `returned`: la clau ja ha tornat.
 * - `missed`: l'hora ha passat sense que ningú baixés a buscar-la.
 *
 * Al taulell només hi queden les dues primeres, perquè consergeria vegi d'un cop
 * d'ull el que li falta per entregar. Una reserva tancada ja no torna a oferir
 * la clau: si algú la torna a necessitar, és una entrega sense reserva.
 */
export type DeskStatus = "pending" | "delivered" | "returned" | "missed";

/**
 * Estat d'una reserva al taulell. `sameDay` són les reserves d'aquell dia: amb
 * el carro a 3a i 4a hora la clau es dona un sol cop, lligada a la 3a, i cobreix
 * la 4a mentre encara era fora quan la 4a començava. Si ha tornat al pati, la 4a
 * torna a estar per entregar.
 */
export function deskStatus(reservation: DeskReservation, sameDay: DeskReservation[], now: Date): DeskStatus {
  const own = sameDay.filter((r) => r.cartId === reservation.cartId && r.userId === reservation.userId);
  const earlierInBlock = own.filter(
    (r) =>
      r.id !== reservation.id &&
      r.startDate < reservation.startDate &&
      reservation.endDate <= blockEnd(r, own),
  );
  const loans = [
    ...reservation.keyLoans,
    ...earlierInBlock.flatMap((r) =>
      r.keyLoans.filter((loan) => !loan.returnedAt || loan.returnedAt > reservation.startDate),
    ),
  ];

  if (loans.some((loan) => !loan.returnedAt)) return "delivered";
  if (loans.length > 0) return "returned";
  return reservation.endDate <= now ? "missed" : "pending";
}

/**
 * Una clau sense reserva (aula, magatzem) no venç a cap hora: no hi ha res que
 * en marqui el final. Es considera endarrerida quan ha passat la nit fora, que
 * és quan deixa de ser "l'han agafada aquest matí" i passa a ser un problema.
 */
export function isOvernight(deliveredAt: Date, now: Date, dayKeyOf: (d: Date) => string): boolean {
  return dayKeyOf(deliveredAt) !== dayKeyOf(now);
}
