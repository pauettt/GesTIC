import { describe, expect, it } from "vitest";

import {
  AFTERNOON_PERIODS,
  breakBefore,
  defaultWeekStart,
  getPeriodById,
  isPastPeriod,
  isSchoolDay,
  LUNCH,
  MORNING_PERIODS,
  RECESS,
  SCHOOL_PERIODS,
} from "@/lib/schedule";

describe("horari del centre", () => {
  it("les sessions són seguides, amb el pati i el dinar com a úniques pauses", () => {
    for (let index = 0; index < SCHOOL_PERIODS.length - 1; index++) {
      const current = SCHOOL_PERIODS[index];
      const next = SCHOOL_PERIODS[index + 1];
      const pause = breakBefore(next.id);
      if (pause) {
        expect(current.end).toBe(pause.start);
        expect(next.start).toBe(pause.end);
      } else {
        expect(current.end).toBe(next.start);
      }
    }
  });

  it("el pati va abans de 4a hora i el dinar abans de la vesprada", () => {
    expect(breakBefore(4)).toBe(RECESS);
    expect(breakBefore(AFTERNOON_PERIODS[0].id)).toBe(LUNCH);
    expect(SCHOOL_PERIODS.filter((period) => breakBefore(period.id))).toHaveLength(2);
  });

  it("la vesprada té quatre sessions, de 15:35 a 19:15", () => {
    expect(AFTERNOON_PERIODS.map((period) => `${period.start}–${period.end}`)).toEqual([
      "15:35–16:30",
      "16:30–17:25",
      "17:25–18:20",
      "18:20–19:15",
    ]);
    expect(SCHOOL_PERIODS).toEqual([...MORNING_PERIODS, ...AFTERNOON_PERIODS]);
    expect(new Set(SCHOOL_PERIODS.map((period) => period.id)).size).toBe(SCHOOL_PERIODS.length);
  });

  it("troba les sessions pel seu identificador", () => {
    expect(getPeriodById(4)?.start).toBe("11:15");
    expect(getPeriodById(8)?.label).toBe("1a de vesprada");
    expect(getPeriodById(99)).toBeUndefined();
  });

  it("entre les de matí no hi ha les de vesprada", () => {
    expect(getPeriodById(7, MORNING_PERIODS)?.end).toBe("14:55");
    expect(getPeriodById(8, MORNING_PERIODS)).toBeUndefined();
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
    // 19:00 a Espanya; l'última sessió de vesprada acaba a les 19:15.
    expect(defaultWeekStart(new Date("2026-09-18T17:00:00Z")).toISOString()).toBe("2026-09-13T22:00:00.000Z");
  });

  it("divendres al vespre i el cap de setmana obren la setmana vinent", () => {
    expect(defaultWeekStart(new Date("2026-09-18T17:30:00Z")).toISOString()).toBe("2026-09-20T22:00:00.000Z");
    expect(defaultWeekStart(new Date("2026-09-19T10:00:00Z")).toISOString()).toBe("2026-09-20T22:00:00.000Z");
  });

  it("amb només les sessions de matí, divendres a la tarda ja obre la setmana vinent", () => {
    // 14:00 a Espanya; la 7a hora acaba a les 14:55.
    expect(defaultWeekStart(new Date("2026-09-18T12:00:00Z"), MORNING_PERIODS).toISOString()).toBe(
      "2026-09-13T22:00:00.000Z",
    );
    expect(defaultWeekStart(new Date("2026-09-18T13:00:00Z"), MORNING_PERIODS).toISOString()).toBe(
      "2026-09-20T22:00:00.000Z",
    );
  });
});
