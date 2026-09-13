import { describe, expect, it } from "vitest";

import { daysOverdue, isCancellable, isOverdue } from "@/lib/loans";

const now = new Date("2026-09-14T10:00:00Z");

describe("isOverdue i daysOverdue", () => {
  it("el mateix dia del venciment encara no és tard", () => {
    // `endDate` es desa a les 23:59 (hora del centre) del dia de retorn.
    const endDate = new Date("2026-09-14T21:59:00Z");
    expect(isOverdue(endDate, now)).toBe(false);
    expect(daysOverdue(endDate, now)).toBe(0);
  });

  it("compta els dies sencers de retard", () => {
    const endDate = new Date("2026-09-11T21:59:00Z");
    expect(isOverdue(endDate, now)).toBe(true);
    expect(daysOverdue(endDate, now)).toBe(2);
  });
});

describe("isCancellable", () => {
  it("una sol·licitud pendent es pot retirar sempre", () => {
    expect(isCancellable({ status: "PENDENT", startDate: new Date("2026-09-01T00:00:00Z") }, now)).toBe(true);
  });

  it("un préstec aprovat es pot retirar mentre no hagi començat", () => {
    expect(isCancellable({ status: "APROVADA", startDate: new Date("2026-09-20T00:00:00Z") }, now)).toBe(true);
  });

  it("un préstec aprovat que ja ha començat no es pot cancel·lar: l'equip pot ser fora", () => {
    expect(isCancellable({ status: "APROVADA", startDate: new Date("2026-09-10T00:00:00Z") }, now)).toBe(false);
  });

  it("les sol·licituds tancades no es poden retirar", () => {
    for (const status of ["REBUTJADA", "RETORNADA", "CANCELLADA"] as const) {
      expect(isCancellable({ status, startDate: new Date("2026-09-20T00:00:00Z") }, now)).toBe(false);
    }
  });
});
