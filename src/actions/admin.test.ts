import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireSuperAdmin, recordAudit, revalidatePath } = vi.hoisted(() => ({
  db: {
    studentDeviceRequest: { updateMany: vi.fn() },
    auditEvent: { create: vi.fn() },
    $transaction: vi.fn(),
  },
  requireSuperAdmin: vi.fn(),
  recordAudit: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("server-only", () => ({}));
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireSuperAdmin }));
vi.mock("@/lib/audit", () => ({ recordAudit }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { anonymizeStudentDeviceRequests } from "@/actions/admin";

beforeEach(() => {
  vi.resetAllMocks();
  requireSuperAdmin.mockResolvedValue({ id: "superadmin-1", email: "pauettt@gmail.com" });
  db.studentDeviceRequest.updateMany.mockResolvedValue({ count: 5 });
});

describe("anonymizeStudentDeviceRequests (RGPD)", () => {
  it("només permet anonimitzar al superadmin", async () => {
    const denied = new Error("Access denied");
    requireSuperAdmin.mockRejectedValue(denied);
    await expect(anonymizeStudentDeviceRequests({ beforeDate: "2024-09-01" })).rejects.toBe(denied);
  });

  it("rebutja dates invàlides", async () => {
    const result = await anonymizeStudentDeviceRequests({ beforeDate: "data-inventada" });
    expect(result).toEqual({ success: false, error: "La data no és vàlida" });
    expect(db.studentDeviceRequest.updateMany).not.toHaveBeenCalled();
  });

  it("anonimitza sol·licituds tancades anteriors a la data i registra auditoria", async () => {
    const result = await anonymizeStudentDeviceRequests({ beforeDate: "2024-09-01" });
    expect(result).toEqual({ success: true });

    expect(db.studentDeviceRequest.updateMany).toHaveBeenCalledWith({
      where: {
        createdAt: { lt: new Date("2024-09-01") },
        status: { in: ["RETORNADA", "REBUTJADA", "CANCELLADA"] },
      },
      data: {
        studentFirstName: "Alumne",
        studentLastName: "Anonimitzat",
        reasonNote: null,
        responseNote: null,
      },
    });

    expect(recordAudit).toHaveBeenCalledWith(
      "superadmin-1",
      "student-requests.anonymize",
      expect.stringContaining("Anonimitzades 5 sol·licituds"),
    );
  });
});
