import { describe, expect, it } from "vitest";
import { moveChromebook, orderChromebooks } from "./chromebook-order";

const devices = [
  { id: "ten", assetTag: "C11-10-" },
  { id: "two", assetTag: "C11-2-" },
  { id: "one", assetTag: "C11-1" },
];

describe("ordre dels dispositius del carro", () => {
  it("ordena els números de manera natural sense modificar les dades originals", () => {
    expect(orderChromebooks(devices).map(({ id }) => id)).toEqual(["one", "two", "ten"]);
    expect(devices[0].id).toBe("ten");
  });

  it("ignora majúscules i accents", () => {
    const tags = ["z2", "À2", "a1", "Z1"];
    expect(orderChromebooks(tags.map((assetTag) => ({ id: assetTag, assetTag }))).map(({ id }) => id))
      .toEqual(["a1", "À2", "Z1", "z2"]);
  });

  it("respecta l'ordre desat, ignora equips fora del carro i afegeix els nous ordenats", () => {
    expect(orderChromebooks(devices, ["gone", "ten"]).map(({ id }) => id)).toEqual(["ten", "one", "two"]);
    expect(orderChromebooks(devices.filter(({ id }) => id !== "two"), ["two", "ten", "one"]).map(({ id }) => id))
      .toEqual(["ten", "one"]);
  });

  it("mou en totes dues direccions fins a la posició clicada", () => {
    const ids = ["one", "two", "ten"];
    expect(moveChromebook(ids, "one", "ten")).toEqual(["two", "ten", "one"]);
    expect(moveChromebook(ids, "ten", "one")).toEqual(["ten", "one", "two"]);
    expect(moveChromebook(ids, "one", "one")).toEqual(ids);
    expect(moveChromebook(ids, "unknown", "one")).toEqual(ids);
  });
});
