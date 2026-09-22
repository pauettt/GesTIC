import { describe, expect, it } from "vitest";

import { zonedDateTime } from "@/lib/date";
import {
  courseEndLabel,
  everyWeekLabel,
  occurrences,
  recurringCourse,
  slotLabel,
} from "@/lib/recurring-reservations";

describe("recurringCourse", () => {
  it("de setembre a juny, és el curs en marxa", () => {
    expect(recurringCourse(zonedDateTime("2026-09-22", "10:00"))).toEqual({
      schoolYear: "2026-2027",
      firstDay: "2026-09-01",
      lastDay: "2027-06-30",
    });
    expect(recurringCourse(zonedDateTime("2027-06-30", "18:00")).schoolYear).toBe("2026-2027");
  });

  it("al juliol i a l'agost ja és el següent, sense tocar l'any a mà", () => {
    expect(recurringCourse(zonedDateTime("2027-07-01", "09:00"))).toEqual({
      schoolYear: "2027-2028",
      firstDay: "2027-09-01",
      lastDay: "2028-06-30",
    });
    expect(recurringCourse(zonedDateTime("2027-08-31", "23:00")).schoolYear).toBe("2027-2028");
  });
});

describe("occurrences", () => {
  it("cada setmana, el mateix dia i la mateixa sessió, fins al 30 de juny", () => {
    // Dimarts 22 de setembre a les 9:00: la 3a hora d'avui encara hi és.
    const weeks = occurrences(2, 3, "2026-2027", zonedDateTime("2026-09-22", "09:00"));
    expect(weeks[0].dateKey).toBe("2026-09-22");
    expect(weeks[0].startDate).toEqual(zonedDateTime("2026-09-22", "09:50"));
    expect(weeks[1].dateKey).toBe("2026-09-29");
    // L'últim dimarts abans del 30 de juny del 2027 és el 29.
    expect(weeks.at(-1)?.dateKey).toBe("2027-06-29");
    expect(weeks).toHaveLength(41);
  });

  it("la sessió d'avui, si ja ha acabat, no hi compta", () => {
    const weeks = occurrences(2, 3, "2026-2027", zonedDateTime("2026-09-22", "11:00"));
    expect(weeks[0].dateKey).toBe("2026-09-29");
  });

  it("demanada a l'estiu, comença la primera setmana de setembre", () => {
    const weeks = occurrences(1, 1, "2027-2028", zonedDateTime("2027-07-15", "10:00"));
    expect(weeks[0].dateKey).toBe("2027-09-06");
  });

  it("un dia o una sessió que no existeixen no donen cap setmana", () => {
    expect(occurrences(6, 3, "2026-2027")).toEqual([]);
    expect(occurrences(2, 99, "2026-2027")).toEqual([]);
  });
});

describe("com es diu", () => {
  it("el dia i la sessió, i fins quan", () => {
    expect(slotLabel(2, 3)).toBe("Dimarts · 3a hora (09:50–10:45)");
    expect(everyWeekLabel(4, 5)).toBe("cada dijous a 5a hora");
    expect(courseEndLabel("2026-2027")).toBe("30 de juny del 2027");
  });
});
