import { beforeEach, describe, expect, it, vi } from "vitest";

import { zonedDateTime } from "@/lib/date";

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => {
  const db = {
    schoolHoliday: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), findMany: vi.fn() },
    reservation: { deleteMany: vi.fn(), count: vi.fn(), findMany: vi.fn(), createMany: vi.fn() },
    recurringReservation: { findMany: vi.fn() },
    appointmentSlot: { deleteMany: vi.fn(), createMany: vi.fn() },
    appointment: { count: vi.fn() },
    appointmentAvailability: { findMany: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, requireAdmin: vi.fn(), revalidatePath: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createHoliday, deleteHoliday } from "@/actions/holidays";

beforeEach(() => {
  vi.resetAllMocks();
  vi.useRealTimers();
  db.$transaction.mockImplementation((run: (tx: typeof db) => unknown) => run(db));
});

describe("createHoliday", () => {
  it("només la coordinació", async () => {
    const denied = new Error("NEXT_REDIRECT");
    requireAdmin.mockRejectedValue(denied);
    await expect(createHoliday({ name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" })).rejects.toBe(
      denied,
    );
    expect(db.schoolHoliday.create).not.toHaveBeenCalled();
  });

  it("allibera les setmanes de reserves fixes d'aquells dies i compta les puntuals, que es queden", async () => {
    vi.useFakeTimers({ now: zonedDateTime("2026-09-28", "10:00"), toFake: ["Date"] });
    db.reservation.deleteMany.mockResolvedValue({ count: 3 });
    db.reservation.count.mockResolvedValue(1);
    db.appointmentSlot.deleteMany.mockResolvedValue({ count: 0 });
    db.appointment.count.mockResolvedValue(0);

    const result = await createHoliday({ name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" });

    expect(result).toEqual({ success: true, freed: 3, oneOff: 1, closedHours: 0, appointments: 0 });
    const upcoming = { gte: zonedDateTime("2026-10-12", "00:00"), lt: zonedDateTime("2026-10-13", "00:00") };
    expect(db.reservation.deleteMany).toHaveBeenCalledWith({
      where: { recurringId: { not: null }, status: "CONFIRMADA", startDate: upcoming },
    });
    expect(db.reservation.count).toHaveBeenCalledWith({
      where: { recurringId: null, status: "CONFIRMADA", startDate: upcoming },
    });
  });

  it("tanca les hores fixes de cites sense cita i compta les cites, que es queden", async () => {
    vi.useFakeTimers({ now: zonedDateTime("2026-09-28", "10:00"), toFake: ["Date"] });
    db.reservation.deleteMany.mockResolvedValue({ count: 0 });
    db.reservation.count.mockResolvedValue(0);
    db.appointmentSlot.deleteMany.mockResolvedValue({ count: 4 });
    db.appointment.count.mockResolvedValue(1);

    const result = await createHoliday({ name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" });

    expect(result).toEqual({ success: true, freed: 0, oneOff: 0, closedHours: 4, appointments: 1 });
    const upcoming = { gte: zonedDateTime("2026-10-12", "00:00"), lt: zonedDateTime("2026-10-13", "00:00") };
    // Les obertes a mà (sense hora fixa) no es toquen: poden ser a propòsit.
    expect(db.appointmentSlot.deleteMany).toHaveBeenCalledWith({
      where: { availabilityId: { not: null }, appointment: { is: null }, startDate: upcoming },
    });
    expect(db.appointment.count).toHaveBeenCalledWith({ where: { slot: { startDate: upcoming } } });
  });

  it("d'un festiu que ja ha començat, no toca el que ja ha passat", async () => {
    const now = zonedDateTime("2026-10-12", "11:00");
    vi.useFakeTimers({ now, toFake: ["Date"] });
    db.reservation.deleteMany.mockResolvedValue({ count: 0 });
    db.reservation.count.mockResolvedValue(0);
    db.appointmentSlot.deleteMany.mockResolvedValue({ count: 0 });
    db.appointment.count.mockResolvedValue(0);

    await createHoliday({ name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" });
    expect(db.reservation.deleteMany.mock.calls[0][0].where.startDate.gte).toEqual(now);
    expect(db.appointmentSlot.deleteMany.mock.calls[0][0].where.startDate.gte).toEqual(now);
  });

  it("rebutja un interval al revés sense tocar res", async () => {
    const result = await createHoliday({ name: "Nadal", startDate: "2027-01-07", endDate: "2026-12-23" });
    expect(result.success).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("deleteHoliday", () => {
  const pilar = { id: "pilar", name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" };
  // Cada dilluns a 1a hora al carro A, aprovada.
  const fixed = {
    id: "fixa-1",
    cartId: "carro-a",
    userId: "prof-1",
    weekday: 1,
    periodId: 1,
    schoolYear: "2026-2027",
    purpose: "Programació",
  };

  beforeEach(() => {
    vi.useFakeTimers({ now: zonedDateTime("2026-09-28", "10:00"), toFake: ["Date"] });
    db.schoolHoliday.findUnique.mockResolvedValue(pilar);
    db.schoolHoliday.findMany.mockResolvedValue([]);
    db.recurringReservation.findMany.mockResolvedValue([fixed]);
    db.reservation.findMany.mockResolvedValue([]);
    db.appointmentAvailability.findMany.mockResolvedValue([]);
  });

  it("torna a posar la setmana de la reserva fixa que queia en el festiu", async () => {
    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: true, restored: 1, reopened: 0 });
    expect(db.schoolHoliday.delete).toHaveBeenCalledWith({ where: { id: "pilar" } });
    expect(db.reservation.createMany).toHaveBeenCalledWith({
      data: [
        {
          cartId: "carro-a",
          userId: "prof-1",
          startDate: zonedDateTime("2026-10-12", "08:00"),
          endDate: zonedDateTime("2026-10-12", "08:55"),
          purpose: "Programació",
          recurringId: "fixa-1",
        },
      ],
    });
  });

  it("no la torna a posar si el titular l'havia alliberada o si ja la té algú altre", async () => {
    const monday = { startDate: zonedDateTime("2026-10-12", "08:00") };
    // La primera consulta són les files de la sèrie; la segona, el carro ocupat.
    db.reservation.findMany.mockResolvedValueOnce([monday]).mockResolvedValueOnce([]);
    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: true, restored: 0, reopened: 0 });

    db.reservation.findMany.mockResolvedValueOnce([]).mockResolvedValueOnce([monday]);
    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: true, restored: 0, reopened: 0 });
    expect(db.reservation.createMany).not.toHaveBeenCalled();
  });

  it("torna a obrir les hores fixes de cites que queien en el festiu, menys les ja obertes", async () => {
    db.recurringReservation.findMany.mockResolvedValue([]);
    // Cada dilluns a 2a hora, i cada dimarts a 1a, que no cau en el festiu.
    db.appointmentAvailability.findMany.mockResolvedValue([
      { id: "fixa-dl", weekday: 1, periodId: 2, schoolYear: "2026-2027", coordinatorId: "anna" },
      { id: "fixa-dt", weekday: 2, periodId: 1, schoolYear: "2026-2027", coordinatorId: "anna" },
    ]);
    db.appointmentSlot.createMany.mockResolvedValue({ count: 1 });

    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: true, restored: 0, reopened: 1 });
    expect(db.appointmentSlot.createMany).toHaveBeenCalledWith({
      data: [
        {
          startDate: zonedDateTime("2026-10-12", "08:55"),
          endDate: zonedDateTime("2026-10-12", "09:50"),
          coordinatorId: "anna",
          availabilityId: "fixa-dl",
        },
      ],
      // Si mentrestant s'ha obert a mà, l'índex únic d'hora i coordinador la salta.
      skipDuplicates: true,
    });
  });

  it("si un altre festiu encara cobreix el dia, no la torna a posar", async () => {
    db.schoolHoliday.findMany.mockResolvedValue([{ ...pilar, id: "pont", name: "Pont" }]);
    db.appointmentAvailability.findMany.mockResolvedValue([
      { id: "fixa-dl", weekday: 1, periodId: 2, schoolYear: "2026-2027", coordinatorId: "anna" },
    ]);
    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: true, restored: 0, reopened: 0 });
    expect(db.reservation.createMany).not.toHaveBeenCalled();
    expect(db.appointmentSlot.createMany).not.toHaveBeenCalled();
  });

  it("si ja no hi és, ho diu", async () => {
    db.schoolHoliday.findUnique.mockResolvedValue(null);
    expect(await deleteHoliday({ id: "pilar" })).toEqual({ success: false, error: "Aquest festiu ja no hi és" });
  });
});
