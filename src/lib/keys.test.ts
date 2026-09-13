import { describe, expect, it } from "vitest";

import { madridDateKey, zonedDateTime } from "@/lib/date";
import { blockEnd, dueAt, isOvernight, KEY_GRACE_MINUTES } from "@/lib/keys";
import { getPeriodById } from "@/lib/schedule";

const DAY = "2026-09-14";

/** Una reserva d'una sessió de l'horari, el dilluns de proves. */
function slot(periodId: number) {
  const period = getPeriodById(periodId);
  if (!period) throw new Error(`No existeix la sessió ${periodId}`);
  return { startDate: zonedDateTime(DAY, period.start), endDate: zonedDateTime(DAY, period.end) };
}

describe("blockEnd", () => {
  it("sense més reserves, el bloc acaba amb la sessió", () => {
    expect(blockEnd(slot(1), [slot(1)])).toEqual(slot(1).endDate);
  });

  it("encadena les sessions seguides", () => {
    expect(blockEnd(slot(1), [slot(1), slot(2), slot(3)])).toEqual(slot(3).endDate);
  });

  it("no encadena una sessió que no és la següent", () => {
    expect(blockEnd(slot(1), [slot(1), slot(3)])).toEqual(slot(1).endDate);
  });

  it("amb el carro a 3a i 4a hora, la clau no s'ha de baixar a l'hora del pati", () => {
    expect(blockEnd(slot(3), [slot(3), slot(4)])).toEqual(slot(4).endDate);
  });

  it("no depèn de l'ordre en què arriben les reserves", () => {
    expect(blockEnd(slot(1), [slot(3), slot(2), slot(1)])).toEqual(slot(3).endDate);
  });
});

describe("dueAt", () => {
  it(`dona ${KEY_GRACE_MINUTES} minuts de marge després del final del bloc`, () => {
    expect(dueAt(slot(5), [slot(5), slot(6)]).getTime()).toBe(
      slot(6).endDate.getTime() + KEY_GRACE_MINUTES * 60_000,
    );
  });
});

describe("isOvernight", () => {
  it("una clau sense reserva només compta com a endarrerida l'endemà", () => {
    const deliveredAt = new Date("2026-09-14T06:00:00Z"); // 8:00 a Espanya
    expect(isOvernight(deliveredAt, new Date("2026-09-14T20:00:00Z"), madridDateKey)).toBe(false); // 22:00
    expect(isOvernight(deliveredAt, new Date("2026-09-14T22:30:00Z"), madridDateKey)).toBe(true); // 00:30 de l'endemà
  });
});
