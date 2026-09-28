import { describe, expect, it } from "vitest";

import { madridDateKey, zonedDateTime } from "@/lib/date";
import { blockEnd, deskStatus, dueAt, isOvernight, KEY_GRACE_MINUTES } from "@/lib/keys";
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

describe("deskStatus", () => {
  const at = (time: string) => zonedDateTime(DAY, time);

  /** Una reserva del carro de proves amb els préstecs de clau que s'hi han lligat. */
  function reservation(periodId: number, keyLoans: { returnedAt: Date | null }[] = [], userId = "prof-1") {
    return { ...slot(periodId), id: `${userId}-${periodId}`, cartId: "carro-1", userId, keyLoans };
  }

  it("sense clau, està per entregar fins que s'acaba l'hora", () => {
    const third = reservation(3);
    expect(deskStatus(third, [third], at("09:30"))).toBe("pending");
    expect(deskStatus(third, [third], at("10:30"))).toBe("pending");
    expect(deskStatus(third, [third], at("10:45"))).toBe("missed");
  });

  it("amb la clau fora, consta entregada encara que l'hora hagi passat", () => {
    const third = reservation(3, [{ returnedAt: null }]);
    expect(deskStatus(third, [third], at("10:00"))).toBe("delivered");
    expect(deskStatus(third, [third], at("11:00"))).toBe("delivered");
  });

  it("quan la clau torna, la reserva es tanca: no es torna a oferir", () => {
    const third = reservation(3, [{ returnedAt: at("10:20") }]);
    expect(deskStatus(third, [third], at("10:25"))).toBe("returned");
  });

  it("amb el carro a 3a i 4a hora, la clau de la 3a cobreix la 4a", () => {
    const out = [reservation(3, [{ returnedAt: null }]), reservation(4)];
    expect(deskStatus(out[1], out, at("11:30"))).toBe("delivered");

    const back = [reservation(3, [{ returnedAt: at("12:10") }]), reservation(4)];
    expect(deskStatus(back[0], back, at("12:15"))).toBe("returned");
    expect(deskStatus(back[1], back, at("12:15"))).toBe("returned");
  });

  it("si la clau torna al pati, la 4a torna a estar per entregar", () => {
    const today = [reservation(3, [{ returnedAt: at("10:50") }]), reservation(4)];
    expect(deskStatus(today[1], today, at("11:00"))).toBe("pending");
  });

  it("una sessió que no és seguida no queda coberta", () => {
    const today = [reservation(3, [{ returnedAt: null }]), reservation(5)];
    expect(deskStatus(today[1], today, at("12:00"))).toBe("pending");
  });

  it("la clau d'un altre professor no cobreix la seva reserva", () => {
    const today = [reservation(3, [{ returnedAt: null }], "prof-1"), reservation(4, [], "prof-2")];
    expect(deskStatus(today[1], today, at("11:00"))).toBe("pending");
  });

  it("si la 3a passa sense que ningú baixi, la 4a encara s'espera", () => {
    const today = [reservation(3), reservation(4)];
    expect(deskStatus(today[0], today, at("11:00"))).toBe("missed");
    expect(deskStatus(today[1], today, at("11:00"))).toBe("pending");
  });
});
