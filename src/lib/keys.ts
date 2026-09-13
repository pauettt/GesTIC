import { RECESS } from "@/lib/schedule";

/** Marge abans de considerar que una clau de carro s'hauria d'haver tornat. */
export const KEY_GRACE_MINUTES = 10;

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

/**
 * Una clau sense reserva (aula, magatzem) no venç a cap hora: no hi ha res que
 * en marqui el final. Es considera endarrerida quan ha passat la nit fora, que
 * és quan deixa de ser "l'han agafada aquest matí" i passa a ser un problema.
 */
export function isOvernight(deliveredAt: Date, now: Date, dayKeyOf: (d: Date) => string): boolean {
  return dayKeyOf(deliveredAt) !== dayKeyOf(now);
}
