import { beforeEach, describe, expect, it, vi } from "vitest";

import { zonedDateTime } from "@/lib/date";

const { db, requireSuperAdmin, requireUser, revalidatePath } = vi.hoisted(() => {
  const db = {
    appointmentSlot: { create: vi.fn(), findFirst: vi.fn() },
    appointment: { create: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, requireSuperAdmin: vi.fn(), requireUser: vi.fn(), revalidatePath: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireSuperAdmin, requireUser, isAdmin: () => false }));
vi.mock("@/lib/background", () => ({ runAfterResponse: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyAppointmentBooked: vi.fn(), notifyAppointmentCancelled: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { bookAppointment, openAppointmentSlot } from "@/actions/appointments";

const activeCoordinator = { role: { in: ["SUPER_ADMIN", "ADMIN"] }, disabledAt: null };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: zonedDateTime("2026-09-28", "10:00"), toFake: ["Date"] });
  db.$transaction.mockImplementation((run: (tx: typeof db) => unknown) => run(db));
  requireSuperAdmin.mockResolvedValue({ id: "coordtic" });
  requireUser.mockResolvedValue({ id: "prof-1", role: "PROFESSOR" });
});

describe("openAppointmentSlot", () => {
  // Dimarts a 3a hora, amb l'Anna.
  const input = { date: "2026-09-29", periodId: 3, coordinatorId: "anna" };

  it("només el superadministrador", async () => {
    const denied = new Error("NEXT_REDIRECT");
    requireSuperAdmin.mockRejectedValue(denied);
    await expect(openAppointmentSlot(input)).rejects.toBe(denied);
    expect(db.appointmentSlot.create).not.toHaveBeenCalled();
  });

  it("obre la plaça del coordinador que l'atendrà", async () => {
    db.user.findFirst.mockResolvedValue({ id: "anna" });
    expect(await openAppointmentSlot(input)).toEqual({ success: true });
    expect(db.user.findFirst).toHaveBeenCalledWith({ where: { id: "anna", ...activeCoordinator }, select: { id: true } });
    expect(db.appointmentSlot.create).toHaveBeenCalledWith({
      data: {
        startDate: zonedDateTime("2026-09-29", "09:50"),
        endDate: zonedDateTime("2026-09-29", "10:45"),
        coordinatorId: "anna",
      },
    });
  });

  it("no n'obre per a qui no és a la coordinació", async () => {
    db.user.findFirst.mockResolvedValue(null);
    expect(await openAppointmentSlot(input)).toEqual({
      success: false,
      error: "Aquesta persona no és a la coordinació TIC",
    });
    expect(db.appointmentSlot.create).not.toHaveBeenCalled();
  });

  it("si ja és oberta per a aquest coordinador, ja és el que es volia", async () => {
    db.user.findFirst.mockResolvedValue({ id: "anna" });
    db.appointmentSlot.create.mockRejectedValue({ code: "P2002" });
    expect(await openAppointmentSlot(input)).toEqual({ success: true });
  });
});

describe("bookAppointment", () => {
  it("només es pot demanar una plaça d'algú que encara és a la coordinació", async () => {
    db.appointmentSlot.findFirst.mockResolvedValue(null);
    expect(await bookAppointment({ slotId: "plaça-1", purpose: "Sociograma de 1r A" })).toEqual({
      success: false,
      error: "Aquesta hora ja no està oberta",
    });
    expect(db.appointmentSlot.findFirst).toHaveBeenCalledWith({
      where: { id: "plaça-1", coordinator: activeCoordinator },
      include: { appointment: true },
    });
    expect(db.appointment.create).not.toHaveBeenCalled();
  });

  it("dona la cita en una plaça lliure", async () => {
    db.appointmentSlot.findFirst.mockResolvedValue({
      id: "plaça-1",
      endDate: zonedDateTime("2026-09-29", "10:45"),
      appointment: null,
    });
    db.appointment.create.mockResolvedValue({ id: "cita-1" });
    expect(await bookAppointment({ slotId: "plaça-1", purpose: "Sociograma de 1r A" })).toEqual({ success: true });
    expect(db.appointment.create).toHaveBeenCalledWith({
      data: { slotId: "plaça-1", userId: "prof-1", purpose: "Sociograma de 1r A" },
    });
  });
});
