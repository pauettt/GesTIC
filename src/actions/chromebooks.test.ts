import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => ({
  db: {
    cart: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn() },
    chromebook: { findUnique: vi.fn(), findMany: vi.fn(), create: vi.fn(), update: vi.fn() },
  },
  requireAdmin: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireAdmin, requireUser: vi.fn(), isAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { setChromebookOrder, upsertCart, upsertChromebook, upsertStudentChromebook } from "@/actions/chromebooks";

const input = { cartId: "cart-1", assetTag: "TEC-3", serialNumber: "SERIAL-3", deviceType: "CHROMEBOOK" };
const duplicateError = { code: "P2002" };

function device(overrides = {}) {
  return { assetTag: "ALU-01", serialNumber: input.serialNumber, isStudentLoanable: true, status: "DISPONIBLE", cart: null, ...overrides };
}

beforeEach(() => {
  vi.resetAllMocks();
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
