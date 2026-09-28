import { describe, expect, it } from "vitest";

import { daysSinceActivity, incidentViewWhere, parseIncidentView, STALLED_DAYS } from "@/lib/incidents";

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

describe("daysSinceActivity", () => {
  it("compta des del moviment més recent, sigui un canvi o un comentari", () => {
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [] }, now)).toBe(10);
    expect(daysSinceActivity({ updatedAt: daysAgo(10), comments: [{ createdAt: daysAgo(3) }] }, now)).toBe(3);
  });
});
