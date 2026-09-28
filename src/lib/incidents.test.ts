import { describe, expect, it } from "vitest";

import {
  daysSinceActivity,
  incidentViewWhere,
  parseIncidentView,
  recentIncidents,
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

describe("recentIncidents", () => {
  it("totes les obertes, encara que siguin velles, i només les tancades més recents", () => {
    const incidents = [
      { id: "a", status: "RESOLTA" },
      { id: "b", status: "TANCADA" },
      { id: "c", status: "EN_CURS" },
      { id: "d", status: "RESOLTA" },
      { id: "e", status: "OBERTA" },
    ] as const;
    expect(recentIncidents([...incidents], 2).map(({ id }) => id)).toEqual(["c", "e", "a", "b"]);
  });
});

describe("daysSinceActivity", () => {
  it("compta des del moviment més recent, sigui un canvi o un comentari", () => {
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [] }, now)).toBe(10);
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [{ createdAt: daysAgo(3) }] }, now)).toBe(3);
  });
});
