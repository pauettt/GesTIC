import { describe, expect, it } from "vitest";
import { moveCart, orderCarts } from "./cart-order";

const carts = [
  { id: "ten", name: "Carro 10" },
  { id: "two", name: "Carro 2" },
  { id: "one", name: "Carro 1" },
];

describe("ordre dels carros", () => {
  it("ordena els números de manera natural sense modificar les dades originals", () => {
    expect(orderCarts(carts).map(({ id }) => id)).toEqual(["one", "two", "ten"]);
    expect(carts[0].id).toBe("ten");
  });

  it("ignora majúscules i accents", () => {
    const names = ["z2", "À2", "a1", "Z1"];
    expect(orderCarts(names.map((name) => ({ id: name, name }))).map(({ id }) => id))
      .toEqual(["a1", "À2", "Z1", "z2"]);
  });

  it("respecta l'ordre desat, ignora carros que ja no hi són i afegeix els nous ordenats", () => {
    expect(orderCarts(carts, ["gone", "ten"]).map(({ id }) => id)).toEqual(["ten", "one", "two"]);
    expect(orderCarts(carts.filter(({ id }) => id !== "two"), ["two", "ten", "one"]).map(({ id }) => id))
      .toEqual(["ten", "one"]);
  });

  it("mou en totes dues direccions fins a la posició clicada", () => {
    const ids = ["one", "two", "ten"];
    expect(moveCart(ids, "one", "ten")).toEqual(["two", "ten", "one"]);
    expect(moveCart(ids, "ten", "one")).toEqual(["ten", "one", "two"]);
    expect(moveCart(ids, "one", "one")).toEqual(ids);
    expect(moveCart(ids, "unknown", "one")).toEqual(ids);
  });
});
