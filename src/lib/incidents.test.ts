import { describe, expect, it } from "vitest";

import {
  daysSinceActivity,
  incidentViewWhere,
  parseIncidentView,
  sortForRecord,
  STALLED_DAYS,
} from "@/lib/incidents";

const now = new Date("2026-09-21T10:00:00Z");
const daysAgo = (days: number) => new Date(now.getTime() - days * 86_400_000);

describe("parseIncidentView", () => {
  it("només accepta les vistes que existeixen", () => {
    expect(parseIncidentView("aturades")).toBe("aturades");
    expect(parseIncidentView("sense-responsable")).toBe("sense-responsable");
    expect(parseIncidentView("altres")).toBeNull();
    expect(parseIncidentView(["aturades"])).toBeNull();
  });
});

describe("incidentViewWhere", () => {
  it("aturades: amb responsable, obertes i sense cap moviment des del tall", () => {
    const cutoff = daysAgo(STALLED_DAYS);
    expect(incidentViewWhere("aturades", now)).toEqual({
      assignedToId: { not: null },
      status: { in: ["OBERTA", "EN_CURS"] },
      updatedAt: { lt: cutoff },
      comments: { none: { createdAt: { gte: cutoff } } },
    });
  });
});

describe("sortForRecord", () => {
  it("les obertes a dalt, i les resoltes i tancades juntes, de la més nova a la més antiga", () => {
    const incidents = [
      { id: "resolta-vella", status: "RESOLTA", createdAt: daysAgo(30) },
      { id: "tancada-nova", status: "TANCADA", createdAt: daysAgo(2) },
      { id: "oberta-vella", status: "OBERTA", createdAt: daysAgo(20) },
      { id: "en-curs-nova", status: "EN_CURS", createdAt: daysAgo(1) },
      { id: "resolta-nova", status: "RESOLTA", createdAt: daysAgo(5) },
    ] as const;
    expect(sortForRecord([...incidents]).map(({ id }) => id)).toEqual([
      "en-curs-nova",
      "oberta-vella",
      "tancada-nova",
      "resolta-nova",
      "resolta-vella",
    ]);
  });
});

describe("daysSinceActivity", () => {
  it("compta des del moviment més recent, sigui un canvi o un comentari", () => {
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [] }, now)).toBe(10);
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [{ createdAt: daysAgo(3) }] }, now)).toBe(3);
  });
});
