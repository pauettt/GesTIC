import { describe, expect, it } from "vitest";

import { locationLabel, resolveLocationFilter, spaceLocationWhere } from "@/lib/locations";

const principal = {
  id: "principal",
  name: "Edifici principal",
  floors: [
    { id: "p0", name: "Planta 0" },
    { id: "p1", name: "Planta 1" },
  ],
};
const exterior = { id: "exterior", name: "Exterior", floors: [] };
const buildings = [principal, exterior];

describe("resolveLocationFilter", () => {
  it("sense res a la URL no filtra", () => {
    expect(resolveLocationFilter(buildings, {})).toBeNull();
  });

  it("un edifici sense plantes es pot filtrar igual", () => {
    expect(resolveLocationFilter(buildings, { edifici: "exterior" })).toEqual({ building: exterior, floor: null });
  });

  it("amb la planta, filtra per totes dues coses", () => {
    expect(resolveLocationFilter(buildings, { edifici: "principal", planta: "p1" })).toEqual({
      building: principal,
      floor: principal.floors[1],
    });
  });

  it("una planta sola porta el seu edifici", () => {
    expect(resolveLocationFilter(buildings, { planta: "p0" })?.building).toBe(principal);
  });

  it("ignora una planta d'un altre edifici i un edifici que no existeix", () => {
    expect(resolveLocationFilter(buildings, { edifici: "exterior", planta: "p0" })).toEqual({
      building: exterior,
      floor: null,
    });
    expect(resolveLocationFilter(buildings, { edifici: "esborrat" })).toBeNull();
    expect(resolveLocationFilter(buildings, { edifici: ["principal", "exterior"] })).toBeNull();
  });
});

describe("spaceLocationWhere i locationLabel", () => {
  it("filtren i anomenen l'edifici i, si n'hi ha, la planta", () => {
    const filter = resolveLocationFilter(buildings, { edifici: "principal", planta: "p0" });
    expect(spaceLocationWhere(filter)).toEqual({ buildingId: "principal", floorId: "p0" });
    expect(spaceLocationWhere(null)).toEqual({});
    expect(filter && locationLabel(filter)).toBe("Edifici principal, Planta 0");
  });
});
