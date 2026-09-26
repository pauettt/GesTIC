import { describe, expect, it } from "vitest";

import { zonedDateTime } from "@/lib/date";
import { holidayBounds, holidayLength, holidayOn, holidayRangeLabel, type Holiday } from "@/lib/holidays";
import { createHolidaySchema } from "@/lib/validations/holidays";

const NADAL: Holiday = { id: "nadal", name: "Nadal", startDate: "2026-12-23", endDate: "2027-01-07" };
const PILAR: Holiday = { id: "pilar", name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" };

describe("holidayOn", () => {
  it("el primer i l'últim dia hi compten", () => {
    expect(holidayOn("2026-12-23", [NADAL])).toBe(NADAL);
    expect(holidayOn("2027-01-01", [NADAL])).toBe(NADAL);
    expect(holidayOn("2027-01-07", [NADAL])).toBe(NADAL);
  });

  it("el dia abans i el dia després, no", () => {
    expect(holidayOn("2026-12-22", [NADAL])).toBeUndefined();
    expect(holidayOn("2027-01-08", [NADAL])).toBeUndefined();
    expect(holidayOn("2026-10-12", [])).toBeUndefined();
  });
});

describe("holidayBounds", () => {
  it("de la mitjanit del primer dia a la de l'endemà de l'últim, a Espanya", () => {
    const { from, to } = holidayBounds(PILAR);
    expect(from).toEqual(zonedDateTime("2026-10-12", "00:00"));
    expect(to).toEqual(zonedDateTime("2026-10-13", "00:00"));
  });

  it("travessa el canvi d'any", () => {
    expect(holidayBounds(NADAL).to).toEqual(zonedDateTime("2027-01-08", "00:00"));
  });
});

describe("holidayLength i holidayRangeLabel", () => {
  it("compta el primer i l'últim dia, també amb el canvi d'hora", () => {
    expect(holidayLength("2026-10-12", "2026-10-12")).toBe(1);
    expect(holidayLength("2026-12-23", "2027-01-07")).toBe(16);
    expect(holidayLength("2027-03-25", "2027-04-05")).toBe(12);
  });

  it("un dia sol, sense «del … al …»; un interval, amb", () => {
    expect(holidayRangeLabel(PILAR)).toMatch(/^12 d.oct\.$/);
    expect(holidayRangeLabel(NADAL)).toMatch(/^del 23 de des\. al 7 de gen\.$/);
  });
});

describe("createHolidaySchema", () => {
  const valid = { name: "Nadal", startDate: "2026-12-23", endDate: "2027-01-07" };

  it("accepta un festiu d'un dia o de dues setmanes", () => {
    expect(createHolidaySchema.safeParse(valid).success).toBe(true);
    expect(createHolidaySchema.safeParse({ ...valid, endDate: valid.startDate }).success).toBe(true);
  });

  it("rebutja un interval al revés, massa llarg o sense nom", () => {
    expect(createHolidaySchema.safeParse({ ...valid, endDate: "2026-12-22" }).success).toBe(false);
    // Un any mal escrit no s'ha d'endur mig curs.
    expect(createHolidaySchema.safeParse({ ...valid, endDate: "2027-12-23" }).success).toBe(false);
    expect(createHolidaySchema.safeParse({ ...valid, name: "  " }).success).toBe(false);
    expect(createHolidaySchema.safeParse({ ...valid, startDate: "23/12/2026" }).success).toBe(false);
  });
});
