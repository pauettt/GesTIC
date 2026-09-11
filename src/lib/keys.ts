/** Marge abans de considerar que una clau de carro s'hauria d'haver tornat. */
export const KEY_GRACE_MINUTES = 10;

type Slot = { startDate: Date; endDate: Date };

/**
 * Final del bloc de reserves seguides que arrenca a `from`.
 *
 * Un professor que té el carro a 3a i 4a hora no ha de rebre cap avís entre
 * mig: baixa la clau al final de l'última. Per això s'encadenen les reserves
 * consecutives (les que comencen just quan acaba l'anterior) del mateix
 * professor i el mateix carro, i el compte enrere surt del final de l'última.
 */
export function blockEnd(from: Slot, sameDaySlots: Slot[]): Date {
  let end = from.endDate;
  let advanced = true;
  while (advanced) {
    advanced = false;
    for (const slot of sameDaySlots) {
      if (slot.startDate.getTime() === end.getTime() && slot.endDate > end) {
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
