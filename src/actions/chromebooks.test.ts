import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    cart: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
    chromebook: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn(), updateMany: vi.fn() },
  },
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireAdmin, requireUser: vi.fn(), isAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import {
  moveChromebooks,
  setCartOrder,
  setChromebookOrder,
  upsertCart,
  upsertChromebook,
  upsertStudentChromebook,
} from "@/actions/chromebooks";

const input = { cartId: "cart-1", assetTag: "TEC-3", serialNumber: "SERIAL-3", deviceType: "CHROMEBOOK" };
const duplicateError = { code: "P2002" };

function device(overrides = {}) {
  return { assetTag: "ALU-01", serialNumber: input.serialNumber, isStudentLoanable: true, status: "DISPONIBLE", cart: null, ...overrides };
}

beforeEach(() => {
  vi.resetAllMocks();
  // Les dues formes: una llista d'operacions o una funció que rep la transacció.
  db.$transaction.mockImplementation((operations: unknown) =>
    typeof operations === "function" ? operations(db) : Promise.all(operations as Promise<unknown>[]),
  );
  db.cart.findUnique.mockResolvedValue({ id: input.cartId });
});

describe("alta i edició de dispositius", () => {
  it("desa una alta vàlida i actualitza el carro", async () => {
    expect(await upsertChromebook(input)).toEqual({ success: true });
    expect(requireAdmin).toHaveBeenCalled();
    expect(db.chromebook.create).toHaveBeenCalledWith({ data: { ...input, brand: null, model: null } });
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks/cart-1");
  });

  it("no considera duplicats els números de sèrie buits", async () => {
    expect(await upsertChromebook({ ...input, serialNumber: "  " })).toEqual({ success: true });
    expect(db.chromebook.create).toHaveBeenCalledWith({ data: expect.objectContaining({ serialNumber: null }) });
  });

  it.each([upsertChromebook, upsertStudentChromebook])("localitza una sèrie que pertany al préstec a l'alumnat", async (action) => {
    db.chromebook.create.mockRejectedValue(duplicateError);
    db.chromebook.findMany.mockResolvedValue([device()]);
    const result = await action(input);
    expect(result).toEqual({ success: false, error: "Ja existeix un dispositiu amb el número de sèrie «SERIAL-3»: «ALU-01», al préstec a l'alumnat." });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("identifica el carro i la baixa d'un identificador duplicat", async () => {
    db.chromebook.create.mockRejectedValue(duplicateError);
    db.chromebook.findMany.mockResolvedValue([device({ assetTag: input.assetTag, serialNumber: "ANOTHER", isStudentLoanable: false, status: "BAIXA", cart: { name: "Tecnologia" } })]);
    expect(await upsertChromebook(input)).toEqual({ success: false, error: "Ja existeix un dispositiu amb l'identificador «TEC-3»: «TEC-3», al carro «Tecnologia», donat de baixa." });
  });

  it("explica els dos conflictes si l'etiqueta i la sèrie són d'equips diferents", async () => {
    db.chromebook.create.mockRejectedValue(duplicateError);
    db.chromebook.findMany.mockResolvedValue([
      device(),
      device({ assetTag: input.assetTag, serialNumber: "ANOTHER", isStudentLoanable: false }),
    ]);
    const result = await upsertChromebook(input);
    expect(result).toEqual({ success: false, error: expect.stringContaining("al préstec a l'alumnat") });
    expect(result).toEqual({ success: false, error: expect.stringContaining("sense carro assignat") });
  });

  it("exclou el mateix equip en editar i omet les sèries buides", async () => {
    db.chromebook.findUnique.mockResolvedValue({ cartId: input.cartId, isStudentLoanable: false });
    db.chromebook.update.mockRejectedValue(duplicateError);
    db.chromebook.findMany.mockResolvedValue([device({ assetTag: input.assetTag })]);
    await upsertChromebook({ ...input, id: "device-1", serialNumber: "" });
    expect(db.chromebook.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: { not: "device-1" }, OR: [{ assetTag: input.assetTag }] },
    }));
  });

  it.each([upsertChromebook, upsertStudentChromebook])("deixa editar un equip amb la seva pròpia etiqueta i sèrie", async (action) => {
    db.chromebook.findUnique.mockResolvedValue({ cartId: input.cartId, isStudentLoanable: action === upsertStudentChromebook });
    expect(await action({ ...input, id: "device-1" })).toEqual({ success: true });
    expect(db.chromebook.update).toHaveBeenCalled();
  });

  it("en canviar-lo de carro des d'Edita, el treu de l'ordre desat de l'antic", async () => {
    db.chromebook.findUnique.mockResolvedValue({ cartId: "cart-0", isStudentLoanable: false });
    db.cart.findMany.mockResolvedValue([
      { id: "cart-0", chromebookOrder: ["device-1", "other"] },
      { id: input.cartId, chromebookOrder: [] },
    ]);
    expect(await upsertChromebook({ ...input, id: "device-1" })).toEqual({ success: true });
    expect(db.cart.update).toHaveBeenCalledTimes(1);
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-0" }, data: { chromebookOrder: ["other"] } });
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks/cart-0");
    expect(revalidatePath).toHaveBeenCalledWith("/q/carro/cart-0");
  });

  it.each([upsertChromebook, upsertStudentChromebook])("no amaga errors de connexió, esquema o permisos com a duplicats", async (action) => {
    for (const error of [new Error("Connection closed"), { code: "P2022" }, { code: "P2003" }]) {
      db.chromebook.create.mockRejectedValue(error);
      await expect(action(input)).rejects.toBe(error);
    }
    expect(db.chromebook.findMany).not.toHaveBeenCalled();
  });

  it("no inventa un conflicte d'etiqueta o sèrie per un altre índex únic", async () => {
    db.chromebook.create.mockRejectedValue(duplicateError);
    db.chromebook.findMany.mockResolvedValue([]);
    await expect(upsertChromebook(input)).rejects.toBe(duplicateError);
  });

  it("no amaga els errors de base de dades en crear un carro", async () => {
    const error = new Error("Connection closed");
    db.cart.create.mockRejectedValue(error);
    await expect(upsertCart({ name: "Tecnologia" })).rejects.toBe(error);
  });
});

describe("ordre compartit del carro", () => {
  beforeEach(() => {
    db.cart.findUnique.mockResolvedValue({ chromebooks: [{ id: "one" }, { id: "two" }] });
  });

  it("només permet ordenar a administradors", async () => {
    requireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(setChromebookOrder({ cartId: "cart-1", deviceIds: [] })).rejects.toThrow("Forbidden");
    expect(db.cart.update).not.toHaveBeenCalled();
  });

  it("desa tot l'ordre i actualitza les vistes del carro", async () => {
    expect(await setChromebookOrder({ cartId: "cart-1", deviceIds: ["two", "one"] })).toEqual({ success: true });
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-1" }, data: { chromebookOrder: ["two", "one"] } });
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks/cart-1");
    expect(revalidatePath).toHaveBeenCalledWith("/q/carro/cart-1");
  });

  it("restaura l'ordre automàtic amb una llista buida", async () => {
    expect(await setChromebookOrder({ cartId: "cart-1", deviceIds: [] })).toEqual({ success: true });
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-1" }, data: { chromebookOrder: [] } });
  });

  it.each([["one", "one"], ["one", "other-cart"], ["one"], ["one", "two", "removed"]])(
    "rebutja duplicats, equips aliens i llistes desactualitzades: %j", async (...deviceIds) => {
      expect(await setChromebookOrder({ cartId: "cart-1", deviceIds })).toMatchObject({ success: false });
      expect(db.cart.update).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();
    },
  );

  it("rebutja carros eliminats i dades invàlides", async () => {
    db.cart.findUnique.mockResolvedValue(null);
    expect(await setChromebookOrder({ cartId: "gone", deviceIds: [] })).toMatchObject({ success: false });
    expect(await setChromebookOrder({ cartId: "", deviceIds: "one" })).toMatchObject({ success: false });
    expect(db.cart.update).not.toHaveBeenCalled();
  });
});

describe("ordre compartit dels carros", () => {
  beforeEach(() => {
    db.cart.findMany.mockResolvedValue([{ id: "one" }, { id: "two" }]);
  });

  it("només permet ordenar a administradors", async () => {
    requireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(setCartOrder({ cartIds: [] })).rejects.toThrow("Forbidden");
    expect(db.cart.updateMany).not.toHaveBeenCalled();
  });

  it("desa tot l'ordre i actualitza les vistes dels carros", async () => {
    expect(await setCartOrder({ cartIds: ["two", "one"] })).toEqual({ success: true });
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "two" }, data: { order: 0 } });
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "one" }, data: { order: 1 } });
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks");
  });

  it("restaura l'ordre automàtic amb una llista buida", async () => {
    expect(await setCartOrder({ cartIds: [] })).toEqual({ success: true });
    expect(db.cart.updateMany).toHaveBeenCalledWith({ data: { order: null } });
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks");
  });

  it.each([["one", "one"], ["one", "other-cart"], ["one"], ["one", "two", "removed"]])(
    "rebutja duplicats, carros aliens i llistes desactualitzades: %j", async (...cartIds) => {
      expect(await setCartOrder({ cartIds })).toMatchObject({ success: false });
      expect(db.cart.update).not.toHaveBeenCalled();
      expect(db.cart.updateMany).not.toHaveBeenCalled();
    },
  );

  it("rebutja dades invàlides", async () => {
    expect(await setCartOrder({ cartIds: "one" })).toMatchObject({ success: false });
    expect(db.cart.update).not.toHaveBeenCalled();
    expect(db.cart.updateMany).not.toHaveBeenCalled();
  });
});


describe("moure dispositius a un altre carro", () => {
  const move = { fromCartId: "cart-1", toCartId: "cart-2", deviceIds: ["one", "three"] };

  beforeEach(() => {
    db.cart.findUnique.mockResolvedValue({ id: "cart-2" });
    db.chromebook.updateMany.mockResolvedValue({ count: 2 });
    db.cart.findMany.mockResolvedValue([
      { id: "cart-1", chromebookOrder: ["three", "two", "one"] },
      { id: "cart-2", chromebookOrder: ["four"] },
    ]);
  });

  it("només ho pot fer la coordinació", async () => {
    requireAdmin.mockRejectedValue(new Error("Forbidden"));
    await expect(moveChromebooks(move)).rejects.toThrow("Forbidden");
    expect(db.chromebook.updateMany).not.toHaveBeenCalled();
  });

  it("mou els equips triats i els treu de l'ordre del carro d'on surten", async () => {
    expect(await moveChromebooks(move)).toEqual({ success: true });
    expect(db.chromebook.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ["one", "three"] }, cartId: "cart-1" },
      data: { cartId: "cart-2" },
    });
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-1" }, data: { chromebookOrder: ["two"] } });
    // Al de destí van al final, com un equip nou: el seu ordre no es toca.
    expect(db.cart.update).toHaveBeenCalledTimes(1);
    for (const path of ["/chromebooks/cart-1", "/chromebooks/cart-2", "/q/carro/cart-1", "/q/carro/cart-2", "/chromebooks"]) {
      expect(revalidatePath).toHaveBeenCalledWith(path);
    }
    expect(revalidatePath).toHaveBeenCalledWith("/chromebooks/equips/[id]", "page");
  });

  it("oblida la posició que un equip hagués tingut abans al carro de destí", async () => {
    db.cart.findMany.mockResolvedValue([
      { id: "cart-1", chromebookOrder: [] },
      { id: "cart-2", chromebookOrder: ["one", "four"] },
    ]);
    expect(await moveChromebooks(move)).toEqual({ success: true });
    expect(db.cart.update).toHaveBeenCalledTimes(1);
    expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-2" }, data: { chromebookOrder: ["four"] } });
  });

  it("no en mou cap si algun ja no és al carro d'origen", async () => {
    db.chromebook.updateMany.mockResolvedValue({ count: 1 });
    expect(await moveChromebooks(move)).toEqual({
      success: false,
      error: "Els dispositius del carro han canviat. Recarrega la pàgina abans de moure'ls.",
    });
    expect(db.cart.update).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("rebutja el mateix carro, llistes buides o repetides i un destí que ja no existeix", async () => {
    expect(await moveChromebooks({ ...move, toCartId: "cart-1" })).toEqual({ success: false, error: "Ja són en aquest carro" });
    expect(await moveChromebooks({ ...move, deviceIds: [] })).toEqual({ success: false, error: "Tria algun dispositiu" });
    expect(await moveChromebooks({ ...move, deviceIds: ["one", "one"] })).toMatchObject({ success: false });
    db.cart.findUnique.mockResolvedValue(null);
    expect(await moveChromebooks(move)).toEqual({ success: false, error: "El carro de destí ja no existeix" });
    expect(db.chromebook.updateMany).not.toHaveBeenCalled();
    expect(revalidatePath).not.toHaveBeenCalled();
  });
});
