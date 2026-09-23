import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireTutor, notify } = vi.hoisted(() => ({
  db: {
    academicGroup: { findUnique: vi.fn() },
    studentDeviceRequest: { findFirst: vi.fn(), create: vi.fn() },
  },
  requireTutor: vi.fn(),
  notify: vi.fn(),
}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireTutor, requireAdmin: vi.fn(), requireUser: vi.fn(), isAdmin: vi.fn() }));
vi.mock("@/lib/rate-limit", () => ({ checkRateLimit: vi.fn() }));
vi.mock("@/lib/notifications", () => ({ notifyStudentDeviceRequested: notify, notifyStudentDeviceDecision: vi.fn() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { createStudentDeviceRequest } from "@/actions/student-devices";

const input = { studentFirstName: "Aina", studentLastName: "Serra", groupId: "group-b", reason: "SENSE_DISPOSITIU" };

beforeEach(() => {
  vi.resetAllMocks();
  requireTutor.mockResolvedValue({ id: "tutor" });
  db.studentDeviceRequest.create.mockResolvedValue({ id: "request" });
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
