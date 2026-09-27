import { beforeEach, describe, expect, it, vi } from "vitest";

import { zonedDateTime } from "@/lib/date";

const { db, requireSuperAdmin, revalidatePath, getHolidays } = vi.hoisted(() => {
  const db = {
    appointmentAvailability: { create: vi.fn(), findUnique: vi.fn(), delete: vi.fn() },
    appointmentSlot: { createMany: vi.fn(), deleteMany: vi.fn(), findMany: vi.fn() },
    user: { findFirst: vi.fn() },
    $transaction: vi.fn(),
  };
  return { db, requireSuperAdmin: vi.fn(), revalidatePath: vi.fn(), getHolidays: vi.fn() };
});

vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireSuperAdmin }));
vi.mock("@/lib/holidays-data", () => ({ getHolidays }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { addAppointmentAvailability, removeAppointmentAvailability } from "@/actions/appointment-availability";

const pilar = { id: "pilar", name: "Pilar", startDate: "2026-10-12", endDate: "2026-10-12" };

beforeEach(() => {
  vi.resetAllMocks();
  vi.useFakeTimers({ now: zonedDateTime("2026-09-28", "10:00"), toFake: ["Date"] });
  db.$transaction.mockImplementation((run: (tx: typeof db) => unknown) => run(db));
  requireSuperAdmin.mockResolvedValue({ id: "coordtic" });
  getHolidays.mockResolvedValue([pilar]);
  db.user.findFirst.mockResolvedValue({ id: "anna" });
});

// Cada dilluns a 1a hora, amb l'Anna.
const mondayFirst = { coordinatorId: "anna", weekday: 1, periodId: 1 };

describe("addAppointmentAvailability", () => {
  it("només el superadministrador", async () => {
    const denied = new Error("NEXT_REDIRECT");
    requireSuperAdmin.mockRejectedValue(denied);
    await expect(addAppointmentAvailability(mondayFirst)).rejects.toBe(denied);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("obre l'hora cada setmana que queda del curs, fins al 30 de juny i sense els festius", async () => {
    db.appointmentAvailability.create.mockResolvedValue({ id: "fixa-1" });

    const result = await addAppointmentAvailability(mondayFirst);

    expect(db.appointmentAvailability.create).toHaveBeenCalledWith({
      data: { weekday: 1, periodId: 1, schoolYear: "2026-2027", coordinatorId: "anna" },
      select: { id: true },
    });
    const { data, skipDuplicates } = db.appointmentSlot.createMany.mock.calls[0][0];
    // Una plaça ja oberta a mà per a l'Anna no es duplica ni passa a ser de l'hora fixa.
    expect(skipDuplicates).toBe(true);
    const starts = data.map((slot: { startDate: Date }) => slot.startDate.getTime());
    // Avui, dilluns, la 1a hora ja ha passat: comença el 5 d'octubre.
    expect(starts[0]).toBe(zonedDateTime("2026-10-05", "08:00").getTime());
    expect(starts).not.toContain(zonedDateTime("2026-10-12", "08:00").getTime());
    expect(starts.at(-1)).toBe(zonedDateTime("2027-06-28", "08:00").getTime());
    expect(data[0]).toEqual({
      startDate: zonedDateTime("2026-10-05", "08:00"),
      endDate: zonedDateTime("2026-10-05", "08:55"),
      coordinatorId: "anna",
      availabilityId: "fixa-1",
    });
    expect(result).toEqual({ success: true, weeks: data.length });
    expect(revalidatePath).toHaveBeenCalledWith("/cites");
  });

  it("si ja és fixa per a aquesta persona, ho diu", async () => {
    db.appointmentAvailability.create.mockRejectedValue({ code: "P2002" });
    expect(await addAppointmentAvailability(mondayFirst)).toEqual({
      success: false,
      error: "Aquesta hora ja és fixa per a aquesta persona aquest curs",
    });
  });

  it("només per a algú de la coordinació que encara hi té accés", async () => {
    db.user.findFirst.mockResolvedValue(null);
    expect(await addAppointmentAvailability(mondayFirst)).toEqual({
      success: false,
      error: "Aquesta persona no és a la coordinació TIC",
    });
    expect(db.user.findFirst).toHaveBeenCalledWith({
      where: { id: "anna", role: { in: ["SUPER_ADMIN", "ADMIN"] }, disabledAt: null },
      select: { id: true },
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("rebutja una sessió que no és a l'horari o un dia de cap de setmana", async () => {
    expect((await addAppointmentAvailability({ ...mondayFirst, periodId: 99 })).success).toBe(false);
    expect((await addAppointmentAvailability({ ...mondayFirst, weekday: 6 })).success).toBe(false);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("a final de curs, si ja no queda cap setmana, no en desa res", async () => {
    vi.setSystemTime(zonedDateTime("2027-06-28", "10:00"));
    expect(await addAppointmentAvailability(mondayFirst)).toEqual({
      success: false,
      error: "Aquest curs ja no queda cap setmana amb aquesta sessió",
    });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("removeAppointmentAvailability", () => {
  it("només el superadministrador", async () => {
    const denied = new Error("NEXT_REDIRECT");
    requireSuperAdmin.mockRejectedValue(denied);
    await expect(removeAppointmentAvailability({ id: "fixa-1" })).rejects.toBe(denied);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it("tanca les setmanes que queden sense cita i diu quines en tenen, que es queden", async () => {
    db.appointmentAvailability.findUnique.mockResolvedValue({ id: "fixa-1" });
    db.appointmentSlot.deleteMany.mockResolvedValue({ count: 30 });
    db.appointmentSlot.findMany.mockResolvedValue([{ startDate: zonedDateTime("2026-10-05", "08:00") }]);

    const result = await removeAppointmentAvailability({ id: "fixa-1" });

    const upcoming = { availabilityId: "fixa-1", startDate: { gt: zonedDateTime("2026-09-28", "10:00") } };
    expect(db.appointmentSlot.deleteMany).toHaveBeenCalledWith({ where: { ...upcoming, appointment: { is: null } } });
    expect(db.appointmentSlot.findMany.mock.calls[0][0].where).toEqual({ ...upcoming, appointment: { isNot: null } });
    expect(db.appointmentAvailability.delete).toHaveBeenCalledWith({ where: { id: "fixa-1" } });
    expect(result).toEqual({ success: true, closed: 30, kept: ["5 d’oct."] });
  });

  it("si ja no hi és, ho diu", async () => {
    db.appointmentAvailability.findUnique.mockResolvedValue(null);
    expect(await removeAppointmentAvailability({ id: "fixa-1" })).toEqual({
      success: false,
      error: "Aquesta hora ja no és fixa",
    });
    expect(db.appointmentSlot.deleteMany).not.toHaveBeenCalled();
  });
});
