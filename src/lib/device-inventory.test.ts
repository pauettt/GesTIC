import { describe, expect, it } from "vitest";

import { savedCartOrder } from "@/lib/cart-order";
import { cartPositions, deviceSearchQuery, deviceSearchWhere } from "@/lib/device-inventory";

describe("inventari de dispositius", () => {
  it("numera els equips de cada carro com la seva graella", () => {
    const positions = cartPositions([
      // Sense ordre desat, pel número: C1-2 abans de C1-10.
      { chromebookOrder: [], chromebooks: [{ id: "a", assetTag: "C1-10" }, { id: "b", assetTag: "C1-2" }] },
      // Amb ordre desat; el que no hi és va al final.
      { chromebookOrder: ["y", "x"], chromebooks: [{ id: "x", assetTag: "C2-1" }, { id: "y", assetTag: "C2-2" }, { id: "z", assetTag: "C2-0" }] },
    ]);
    expect(Object.fromEntries(positions)).toEqual({ b: 1, a: 2, y: 1, x: 2, z: 3 });
  });

  it("busca literalment, sense comodins, i sense cerca no filtra res", () => {
    expect(deviceSearchWhere("")).toEqual({});
    const where = deviceSearchWhere("5CD_1%");
    expect(where.OR).toContainEqual({ serialNumber: { contains: "5CD\\_1\\%", mode: "insensitive" } });
    expect(where.OR).toContainEqual({ cart: { name: { contains: "5CD\\_1\\%", mode: "insensitive" } } });
  });

  it("neteja la cerca de la URL", () => {
    expect(deviceSearchQuery("  NXHQ1  ")).toBe("NXHQ1");
    expect(deviceSearchQuery(["a", "b"])).toBe("");
    expect(deviceSearchQuery("x".repeat(300))).toHaveLength(200);
  });

  it("llegeix l'ordre desat dels carros, i cap si no n'hi ha", () => {
    expect(savedCartOrder([{ id: "a", order: 1 }, { id: "b", order: 0 }, { id: "c", order: null }])).toEqual(["b", "a"]);
    expect(savedCartOrder([{ id: "a", order: null }])).toEqual([]);
  });
});
