import { describe, expect, it } from "vitest";

import {
  addDays,
  formatDayDateLong,
  formatWeekday,
  formatWeekdayShort,
  madridDateKey,
  schoolYearOf,
  schoolYearRange,
  schoolYearsBetween,
  startOfWeek,
  toDateTimeLocalValue,
  zonedDateTime,
  zonedDateTimeFromLocal,
} from "@/lib/date";

// Les proves corren amb TZ=America/Los_Angeles (vitest.config.mts): si algun
// d'aquests helpers fes servir la zona del procés, els resultats no quadrarien.

describe("zonedDateTime", () => {
  it("interpreta l'hora en hora d'Espanya a l'estiu (UTC+2)", () => {
    expect(zonedDateTime("2026-09-14", "08:00").toISOString()).toBe("2026-09-14T06:00:00.000Z");
  });

  it("interpreta l'hora en hora d'Espanya a l'hivern (UTC+1)", () => {
    expect(zonedDateTime("2026-01-12", "08:00").toISOString()).toBe("2026-01-12T07:00:00.000Z");
  });

  it("segueix els canvis d'hora de març i octubre", () => {
    expect(zonedDateTime("2026-03-27", "08:00").toISOString()).toBe("2026-03-27T07:00:00.000Z");
    expect(zonedDateTime("2026-03-30", "08:00").toISOString()).toBe("2026-03-30T06:00:00.000Z");
    expect(zonedDateTime("2026-10-23", "08:00").toISOString()).toBe("2026-10-23T06:00:00.000Z");
    expect(zonedDateTime("2026-10-26", "08:00").toISOString()).toBe("2026-10-26T07:00:00.000Z");
  });

  it("anada i tornada amb el valor d'un <input type=datetime-local>", () => {
    expect(toDateTimeLocalValue(zonedDateTimeFromLocal("2026-09-14T17:30"))).toBe("2026-09-14T17:30");
  });
});

describe("madridDateKey", () => {
  it("fa servir el dia d'Espanya, no el d'UTC", () => {
    // Diumenge 13 a les 22:30 UTC ja és dilluns 14 a Espanya.
    expect(madridDateKey(new Date("2026-09-13T22:30:00Z"))).toBe("2026-09-14");
  });
});

describe("startOfWeek i addDays", () => {
  it("un diumenge pertany a la setmana del dilluns anterior", () => {
    expect(startOfWeek(new Date("2026-09-13T10:00:00Z")).toISOString()).toBe("2026-09-06T22:00:00.000Z");
  });

  it("dilluns a mitjanit ja és la setmana nova, encara que en UTC sigui diumenge", () => {
    expect(startOfWeek(new Date("2026-09-13T22:30:00Z")).toISOString()).toBe("2026-09-13T22:00:00.000Z");
  });

  it("afegir una setmana manté la mitjanit encara que canviï l'hora", () => {
    const mondayBeforeChange = startOfWeek(new Date("2026-10-19T10:00:00Z"));
    expect(mondayBeforeChange.toISOString()).toBe("2026-10-18T22:00:00.000Z");
    expect(addDays(mondayBeforeChange, 7).toISOString()).toBe("2026-10-25T23:00:00.000Z");
  });
});

describe("curs escolar", () => {
  it("canvia de curs l'1 de setembre a mitjanit, hora d'Espanya", () => {
    expect(schoolYearOf(new Date("2026-08-31T21:59:00Z"))).toBe("2025-2026");
    expect(schoolYearOf(new Date("2026-08-31T22:00:00Z"))).toBe("2026-2027");
  });

  it("l'interval d'un curs va de l'1 de setembre a l'1 de setembre següent", () => {
    const { start, end } = schoolYearRange("2026-2027");
    expect(start.toISOString()).toBe("2026-08-31T22:00:00.000Z");
    expect(end.toISOString()).toBe("2027-08-31T22:00:00.000Z");
  });

  it("llista els cursos del més recent al més antic", () => {
    expect(
      schoolYearsBetween(new Date("2024-10-01T10:00:00Z"), new Date("2026-09-13T10:00:00Z")),
    ).toEqual(["2026-2027", "2025-2026", "2024-2025"]);
  });
});

describe("dies de la setmana en català", () => {
  it("retorna els noms i abreviatures correctes per a cada dia", () => {
    // 2026-09-14 és dilluns
    const dilluns = new Date("2026-09-14T10:00:00Z");
    expect(formatWeekday(dilluns)).toBe("Dilluns");
    expect(formatWeekdayShort(dilluns)).toBe("Dl");

    // 2026-09-20 és diumenge
    const diumenge = new Date("2026-09-20T10:00:00Z");
    expect(formatWeekday(diumenge)).toBe("Diumenge");
    expect(formatWeekdayShort(diumenge)).toBe("Dg");
  });

  it("formata el dia complet amb majúscula inicial", () => {
    const d = new Date("2026-09-21T10:00:00Z");
    expect(formatDayDateLong(d)).toContain("Dilluns");
    expect(formatDayDateLong(d)).toContain("21");
    expect(formatDayDateLong(d)).toContain("2026");
  });
});
