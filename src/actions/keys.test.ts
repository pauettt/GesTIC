import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireKeyAccess, revalidatePath } = vi.hoisted(() => {
  return {
    db: {
      key: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn(), delete: vi.fn() },
      keyLoan: { findUnique: vi.fn(), create: vi.fn(), update: vi.fn(), count: vi.fn() },
      concierge: { findUnique: vi.fn(), findFirst: vi.fn(), create: vi.fn(), update: vi.fn() },
      user: { findUnique: vi.fn() },
      reservation: { findUnique: vi.fn() },
    },
    requireKeyAccess: vi.fn(),
    revalidatePath: vi.fn(),
  };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireKeyAccess, requireSuperAdmin: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { returnKey } from "@/actions/keys";
import { returnKeySchema } from "@/lib/validations/keys";

beforeEach(() => {
  vi.resetAllMocks();
  requireKeyAccess.mockResolvedValue(undefined);
});

describe("returnKeySchema", () => {
  it("valida un retorn correcte amb préstec i conserge", () => {
    expect(returnKeySchema.safeParse({ loanId: "loan-1", returnedById: "conserge-1" }).success).toBe(true);
  });

  it("obliga a indicar quin conserge recull la clau", () => {
    expect(returnKeySchema.safeParse({ loanId: "loan-1" }).success).toBe(false);
    expect(returnKeySchema.safeParse({ loanId: "loan-1", returnedById: "" }).success).toBe(false);
    expect(returnKeySchema.safeParse({ loanId: "", returnedById: "conserge-1" }).success).toBe(false);
  });
});

describe("returnKey action", () => {
  it("demana permisos d'accés a claus", async () => {
    const error = new Error("No autoritzat");
    requireKeyAccess.mockRejectedValue(error);
    await expect(returnKey({ loanId: "loan-1", returnedById: "conserge-1" })).rejects.toBe(error);
  });

  it("falla si no s'indica el conserge que recull la clau", async () => {
    const res = await returnKey({ loanId: "loan-1" });
    expect(res).toEqual({ success: false, error: "Tria quin conserge recull la clau" });
    expect(db.keyLoan.update).not.toHaveBeenCalled();
  });

  it("falla si el préstec no existeix", async () => {
    db.keyLoan.findUnique.mockResolvedValue(null);
    db.concierge.findUnique.mockResolvedValue({ id: "conserge-1", active: true });

    const res = await returnKey({ loanId: "loan-inexistent", returnedById: "conserge-1" });
    expect(res).toEqual({ success: false, error: "Aquest préstec no existeix" });
    expect(db.keyLoan.update).not.toHaveBeenCalled();
  });

  it("falla si la clau ja s'ha tornat anteriorment", async () => {
    db.keyLoan.findUnique.mockResolvedValue({ id: "loan-1", returnedAt: new Date() });
    db.concierge.findUnique.mockResolvedValue({ id: "conserge-1", active: true });

    const res = await returnKey({ loanId: "loan-1", returnedById: "conserge-1" });
    expect(res).toEqual({ success: false, error: "Aquesta clau ja consta tornada" });
    expect(db.keyLoan.update).not.toHaveBeenCalled();
  });

  it("falla si el conserge no existeix o està donat de baixa", async () => {
    db.keyLoan.findUnique.mockResolvedValue({ id: "loan-1", returnedAt: null });
    db.concierge.findUnique.mockResolvedValue({ id: "conserge-1", active: false });

    const res = await returnKey({ loanId: "loan-1", returnedById: "conserge-1" });
    expect(res).toEqual({ success: false, error: "Tria quin conserge recull la clau" });
    expect(db.keyLoan.update).not.toHaveBeenCalled();
  });

  it("registra el retorn amb data i el conserge que ha recollit la clau", async () => {
    db.keyLoan.findUnique.mockResolvedValue({ id: "loan-1", returnedAt: null });
    db.concierge.findUnique.mockResolvedValue({ id: "conserge-1", active: true });

    const res = await returnKey({ loanId: "loan-1", returnedById: "conserge-1" });
    expect(res).toEqual({ success: true });
    expect(db.keyLoan.update).toHaveBeenCalledWith({
      where: { id: "loan-1" },
      data: {
        returnedAt: expect.any(Date),
        returnedById: "conserge-1",
      },
    });
    expect(revalidatePath).toHaveBeenCalledWith("/consergeria");
    expect(revalidatePath).toHaveBeenCalledWith("/consergeria/historial");
  });
});
