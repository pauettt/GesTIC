import { describe, expect, it } from "vitest";

import { defaultCartSearch, parseCartSearch } from "@/lib/cart-finder";
import { zonedDateTime } from "@/lib/date";

// Dimarts 22 de setembre de 2026, a les 10:00 (hora del centre): la 3a hora és en curs.
const tuesdayTen = zonedDateTime("2026-09-22", "10:00");

describe("parseCartSearch", () => {
  it("sense dia ni sessió no hi ha cerca", () => {
    expect(parseCartSearch({}, tuesdayTen)).toEqual({ status: "none" });
  });

  it("amb dia i sessió, cerca aquella franja i, si es demana, un mínim d'equips", () => {
    const result = parseCartSearch({ dia: "2026-09-22", sessio: "4", equips: "20" }, tuesdayTen);
    expect(result.status).toBe("ok");
    if (result.status !== "ok") return;
    expect(result.search.period.label).toBe("4a hora");
    expect(result.search.minDevices).toBe(20);
    expect(result.search.startDate).toEqual(zonedDateTime("2026-09-22", "11:15"));
    expect(result.search.endDate).toEqual(zonedDateTime("2026-09-22", "12:10"));
  });

  it("la sessió en curs encara es pot buscar; la que ja ha acabat, no", () => {
    expect(parseCartSearch({ dia: "2026-09-22", sessio: "3" }, tuesdayTen).status).toBe("ok");
    expect(parseCartSearch({ dia: "2026-09-22", sessio: "2" }, tuesdayTen)).toEqual({
      status: "invalid",
      message: "Aquesta sessió ja ha passat.",
    });
  });

  it("rebutja el cap de setmana, les sessions que no existeixen i un mínim que no és un número", () => {
    expect(parseCartSearch({ dia: "2026-09-26", sessio: "1" }, tuesdayTen).status).toBe("invalid");
    expect(parseCartSearch({ dia: "2026-09-23", sessio: "9" }, tuesdayTen).status).toBe("invalid");
    const loose = parseCartSearch({ dia: "2026-09-23", sessio: "1", equips: "molts" }, tuesdayTen);
    expect(loose.status === "ok" && loose.search.minDevices).toBe(0);
  });
});

describe("defaultCartSearch", () => {
  it("proposa la sessió que encara no ha acabat, avui", () => {
    expect(defaultCartSearch(tuesdayTen)).toEqual({ dateKey: "2026-09-22", periodId: 3 });
  });

  it("a la tarda o en cap de setmana, la primera del proper dia lectiu", () => {
    expect(defaultCartSearch(zonedDateTime("2026-09-22", "16:00"))).toEqual({
      dateKey: "2026-09-23",
      periodId: 1,
    });
    expect(defaultCartSearch(zonedDateTime("2026-09-26", "10:00"))).toEqual({
      dateKey: "2026-09-28",
      periodId: 1,
    });
  });
});
