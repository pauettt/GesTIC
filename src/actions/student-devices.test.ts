import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireTutor, requireAdmin, notify, revalidatePath } = vi.hoisted(() => ({
  db: {
    academicGroup: { findUnique: vi.fn() },
    studentDeviceRequest: { findFirst: vi.fn(), create: vi.fn(), findUnique: vi.fn(), delete: vi.fn(), count: vi.fn() },
    chromebook: { findUnique: vi.fn(), update: vi.fn() },
    incident: { count: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  requireTutor: vi.fn(),
  requireAdmin: vi.fn(),
  notify: vi.fn(),
  revalidatePath: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireTutor, requireAdmin, requireUser: vi.fn(), isAdmin: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyStudentDeviceRequested: notify, notifyStudentDeviceDecision: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { createStudentDeviceRequest, deleteStudentDeviceRequest } from "@/actions/student-devices";

const input = { studentFirstName: "Aina", studentLastName: "Serra", groupId: "group-b", reason: "SENSE_DISPOSITIU" };

beforeEach(() => {
  vi.resetAllMocks();
  requireTutor.mockResolvedValue({ id: "tutor" });
  db.studentDeviceRequest.create.mockResolvedValue({ id: "request" });
  requireAdmin.mockResolvedValue({ id: "admin" });
  db.$transaction.mockImplementation(async (work) => work(db));
});

describe("esborrat de sol·licituds d'alumnat", () => {
  it("només deixa esborrar a la coordinació", async () => {
    const denied = new Error("Access denied");
    requireAdmin.mockRejectedValue(denied);
    await expect(deleteStudentDeviceRequest({ id: "request", status: "PENDENT" })).rejects.toBe(denied);
    expect(db.$transaction).not.toHaveBeenCalled();
  });

  it.each(["PENDENT", "REBUTJADA", "CANCELLADA", "RETORNADA"])("esborra una sol·licitud %s i registra qui ho ha fet", async (status) => {
    db.studentDeviceRequest.findUnique.mockResolvedValue({ status, chromebookId: null });
    expect(await deleteStudentDeviceRequest({ id: "request", status })).toEqual({ success: true });
    expect(db.studentDeviceRequest.delete).toHaveBeenCalledWith({ where: { id: "request", status, chromebookId: null } });
    expect(db.auditEvent.create).toHaveBeenCalledWith({ data: {
      actorId: "admin", action: "student-request.delete", summary: expect.stringContaining("Sol·licitud de préstec"),
    } });
    expect(notify).not.toHaveBeenCalled();
    expect(revalidatePath).toHaveBeenCalledWith("/alumnat", "layout");
    expect(revalidatePath).toHaveBeenCalledWith("/espais");
  });

  it.each(["APROVADA", "ENTREGADA"])("allibera l'equip d'una sol·licitud %s", async (status) => {
    db.studentDeviceRequest.findUnique.mockResolvedValue({ status, chromebookId: "device" });
    db.chromebook.findUnique.mockResolvedValue({ status: "ASSIGNAT" });
    db.incident.count.mockResolvedValue(0);
    db.studentDeviceRequest.count.mockResolvedValue(0);
    expect(await deleteStudentDeviceRequest({ id: "request", status })).toEqual({ success: true });
    expect(db.chromebook.update).toHaveBeenCalledWith({ where: { id: "device" }, data: { status: "DISPONIBLE" } });
    expect(db.studentDeviceRequest.delete.mock.invocationCallOrder[0]).toBeLessThan(db.studentDeviceRequest.count.mock.invocationCallOrder[0]);
  });

  it.each([
    { status: "EN_INCIDENCIA", incidents: 1, assignments: 0 },
    { status: "BAIXA", incidents: 0, assignments: 0 },
    { status: "NO_DISPONIBLE", incidents: 0, assignments: 0 },
    { status: "ASSIGNAT", incidents: 0, assignments: 1 },
  ])("respecta l'estat $status si l'equip encara no pot quedar lliure", async ({ status, incidents, assignments }) => {
    db.studentDeviceRequest.findUnique.mockResolvedValue({ status: "RETORNADA", chromebookId: "device" });
    db.chromebook.findUnique.mockResolvedValue({ status });
    db.incident.count.mockResolvedValue(incidents);
    db.studentDeviceRequest.count.mockResolvedValue(assignments);
    expect(await deleteStudentDeviceRequest({ id: "request", status: "RETORNADA" })).toEqual({ success: true });
    expect(db.chromebook.update).not.toHaveBeenCalled();
  });

  it("no esborra una sol·licitud que ha canviat des que es va obrir la confirmació", async () => {
    db.studentDeviceRequest.findUnique.mockResolvedValue({ status: "ENTREGADA", chromebookId: "device" });
    expect(await deleteStudentDeviceRequest({ id: "request", status: "APROVADA" })).toMatchObject({ success: false });
    expect(db.studentDeviceRequest.delete).not.toHaveBeenCalled();
    expect(db.auditEvent.create).not.toHaveBeenCalled();
  });

  it("detecta un canvi concurrent entre llegir i esborrar", async () => {
    db.studentDeviceRequest.findUnique.mockResolvedValue({ status: "APROVADA", chromebookId: "device" });
    db.studentDeviceRequest.delete.mockRejectedValue({ code: "P2025" });
    expect(await deleteStudentDeviceRequest({ id: "request", status: "APROVADA" })).toMatchObject({ success: false });
    expect(db.chromebook.update).not.toHaveBeenCalled();
    expect(db.auditEvent.create).not.toHaveBeenCalled();
  });

  it("requereix l'estat que s'ha confirmat", async () => {
    expect(await deleteStudentDeviceRequest({ id: "request" })).toMatchObject({ success: false });
    expect(db.$transaction).not.toHaveBeenCalled();
  });
});

describe("grup d'una sol·licitud d'alumnat", () => {
  it("desa el grup real i el nom complet del catàleg, mai un text rebut del navegador", async () => {
    db.academicGroup.findUnique.mockResolvedValue({ id: "group-b", name: "B", course: { name: "2n", stage: { name: "ESO" } } });
    expect(await createStudentDeviceRequest({ ...input, groupName: "Text inventat" })).toEqual({ success: true });
    expect(db.studentDeviceRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ groupId: "group-b", groupName: "2n ESO B" }) });
    expect(notify).toHaveBeenCalledWith("request");
  });

  it("rebutja un grup inventat o eliminat", async () => {
    db.academicGroup.findUnique.mockResolvedValue(null);
    expect(await createStudentDeviceRequest(input)).toMatchObject({ success: false });
    expect(db.studentDeviceRequest.create).not.toHaveBeenCalled();
    expect(notify).not.toHaveBeenCalled();
  });

  it("manté el grup opcional sense acceptar noms lliures", async () => {
    expect(await createStudentDeviceRequest({ ...input, groupId: "", groupName: "Inventat" })).toEqual({ success: true });
    expect(db.academicGroup.findUnique).not.toHaveBeenCalled();
    expect(db.studentDeviceRequest.create).toHaveBeenCalledWith({ data: expect.objectContaining({ groupId: null, groupName: null }) });
  });

  it("avisa si el grup desapareix durant l'alta", async () => {
    db.academicGroup.findUnique.mockResolvedValue({ id: "group-b", name: "B", course: { name: "2n", stage: { name: "ESO" } } });
    db.studentDeviceRequest.create.mockRejectedValue({ code: "P2003" });
    expect(await createStudentDeviceRequest(input)).toMatchObject({ success: false });
    expect(notify).not.toHaveBeenCalled();
  });
});
