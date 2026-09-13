import { describe, expect, it } from "vitest";

import {
  defaultWeekStart,
  getPeriodById,
  isPastPeriod,
  isSchoolDay,
  RECESS,
  RECESS_BEFORE_PERIOD_INDEX,
  SCHOOL_PERIODS,
} from "@/lib/schedule";

describe("horari del centre", () => {
  it("les sessions són seguides, amb el pati com a única pausa", () => {
    for (let index = 0; index < SCHOOL_PERIODS.length - 1; index++) {
      const current = SCHOOL_PERIODS[index];
      const next = SCHOOL_PERIODS[index + 1];
      if (index + 1 === RECESS_BEFORE_PERIOD_INDEX) {
        expect(current.end).toBe(RECESS.start);
        expect(next.start).toBe(RECESS.end);
      } else {
        expect(current.end).toBe(next.start);
      }
    }
  });

  it("troba les sessions pel seu identificador", () => {
    expect(getPeriodById(4)?.start).toBe("11:15");
    expect(getPeriodById(99)).toBeUndefined();
  });
});

describe("isPastPeriod", () => {
  it("una sessió en curs encara no ha passat: el carro es pot demanar a mitja classe", () => {
    const end = new Date("2026-09-14T06:55:00Z");
    expect(isPastPeriod(end, new Date("2026-09-14T06:30:00Z"))).toBe(false);
    expect(isPastPeriod(end, new Date("2026-09-14T07:00:00Z"))).toBe(true);
  });
});

describe("isSchoolDay", () => {
  it("només de dilluns a divendres", () => {
    expect(isSchoolDay("2026-09-12")).toBe(false); // dissabte
    expect(isSchoolDay("2026-09-13")).toBe(false); // diumenge
    expect(isSchoolDay("2026-09-14")).toBe(true); // dilluns
    expect(isSchoolDay("2026-09-18")).toBe(true); // divendres
  });
});

describe("defaultWeekStart", () => {
  it("entre setmana obre la setmana en curs", () => {
    expect(defaultWeekStart(new Date("2026-09-16T08:00:00Z")).toISOString()).toBe("2026-09-13T22:00:00.000Z");
  });

  it("divendres abans de l'última hora encara és la setmana en curs", () => {
    // 14:00 a Espanya; l'última sessió acaba a les 14:55.
    expect(defaultWeekStart(new Date("2026-09-18T12:00:00Z")).toISOString()).toBe("2026-09-13T22:00:00.000Z");
  });

  it("divendres a la tarda i el cap de setmana obren la setmana vinent", () => {
    expect(defaultWeekStart(new Date("2026-09-18T13:00:00Z")).toISOString()).toBe("2026-09-20T22:00:00.000Z");
    expect(defaultWeekStart(new Date("2026-09-19T10:00:00Z")).toISOString()).toBe("2026-09-20T22:00:00.000Z");
  });
});
