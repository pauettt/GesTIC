import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Role } from "@prisma/client";

const { db, requireUser, requireAdmin } = vi.hoisted(() => ({
  db: {
    cart: { findUnique: vi.fn(), update: vi.fn() },
    chromebook: { findUnique: vi.fn() },
    reservation: { findFirst: vi.fn(), create: vi.fn() },
    deviceReservation: { findFirst: vi.fn(), create: vi.fn() },
    recurringReservation: { findFirst: vi.fn(), count: vi.fn(), create: vi.fn() },
    $transaction: vi.fn(),
    $queryRaw: vi.fn(),
  },
  requireUser: vi.fn(),
  requireAdmin: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireUser, requireAdmin, isAdmin: (role: string) => role === "ADMIN" || role === "SUPER_ADMIN" }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyRecurringRequested: vi.fn(), notifyRecurringCancelled: vi.fn(), notifyRecurringDecision: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));

import { createReservation, upsertCart } from "@/actions/chromebooks";
import { createDeviceReservation } from "@/actions/device-reservations";
import { requestRecurringReservation } from "@/actions/recurring-reservations";
import { CART_ACCESS_DENIED, visibleCartsWhere } from "@/lib/cart-access";

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-09-23T08:00:00Z"));
  db.$transaction.mockImplementation((callback) => callback(db));
  db.recurringReservation.create.mockResolvedValue({ id: "recurring-1" });
});
afterEach(() => vi.useRealTimers());

const actions = [
  { name: "carro", action: createReservation, input: { cartId: "cart-1", date: "2026-09-28", periodIds: [2] }, create: db.reservation.create },
  { name: "equip", action: createDeviceReservation, input: { chromebookId: "device-1", date: "2026-09-28", fromPeriodId: 2, toPeriodId: 3 }, create: db.deviceReservation.create },
  { name: "reserva fixa", action: requestRecurringReservation, input: { cartId: "cart-1", weekday: 1, periodId: 2, purpose: "Classe" }, create: db.recurringReservation.create },
];

describe.each(actions)("visibilitat: $name", ({ action, input, create }) => {
  it.each<{ role: Role; visible: boolean; allowed: boolean }>([
    { role: "PROFESSOR", visible: false, allowed: false },
    { role: "PROFESSOR", visible: true, allowed: true },
    { role: "ADMIN", visible: false, allowed: true },
    { role: "SUPER_ADMIN", visible: false, allowed: true },
  ])("$role amb visible=$visible: permès=$allowed", async ({ role, visible, allowed }) => {
    requireUser.mockResolvedValue({ id: "user-1", role });
    db.cart.findUnique.mockResolvedValue({ id: "cart-1", isVisibleToTeachers: visible });
    db.chromebook.findUnique.mockResolvedValue({ cartId: "cart-1", status: "DISPONIBLE", isStudentLoanable: false, cart: { isVisibleToTeachers: visible } });
    const result = await action(input);
    if (allowed) {
      expect(result).toEqual({ success: true });
      expect(create).toHaveBeenCalledOnce();
    } else {
      expect(result).toEqual({ success: false, error: CART_ACCESS_DENIED });
      expect(create).not.toHaveBeenCalled();
    }
  });
});

it("filtra els carros abans d'enviar-los al professorat", () => {
  expect(visibleCartsWhere("PROFESSOR")).toEqual({ isVisibleToTeachers: true });
  expect(visibleCartsWhere("ADMIN")).toEqual({});
  expect(visibleCartsWhere("SUPER_ADMIN")).toEqual({});
});

it("desa la visibilitat només després de comprovar permisos de coordinació", async () => {
  await upsertCart({ id: "cart-1", name: "Informàtica", isVisibleToTeachers: false });
  expect(requireAdmin).toHaveBeenCalledOnce();
  expect(db.cart.update).toHaveBeenCalledWith({ where: { id: "cart-1" }, data: expect.objectContaining({ isVisibleToTeachers: false }) });
  db.cart.update.mockClear();
  requireAdmin.mockRejectedValue(new Error("Forbidden"));
  await expect(upsertCart({ id: "cart-1", name: "Informàtica", isVisibleToTeachers: true })).rejects.toThrow("Forbidden");
  expect(db.cart.update).not.toHaveBeenCalled();
});

it("editar sense enviar la visibilitat conserva la configuració anterior", async () => {
  await upsertCart({ id: "cart-1", name: "Informàtica" });
  expect(db.cart.update.mock.calls[0][0].data).not.toHaveProperty("isVisibleToTeachers");
});
