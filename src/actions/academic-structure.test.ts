import { beforeEach, describe, expect, it, vi } from "vitest";

const { db, requireAdmin, revalidatePath } = vi.hoisted(() => {
  const model = () => ({ create: vi.fn(), update: vi.fn(), delete: vi.fn(), findUnique: vi.fn(), findMany: vi.fn() });
  return {
    db: { academicStage: model(), academicCourse: model(), academicGroup: model(), $transaction: vi.fn() },
    requireAdmin: vi.fn(),
    revalidatePath: vi.fn(),
  };
});
vi.mock("@/lib/db", () => ({ db }));
vi.mock("@/lib/permissions", () => ({ requireAdmin }));
vi.mock("next/cache", () => ({ revalidatePath }));

import { deleteAcademicEntry, reorderAcademicEntry, upsertAcademicEntry } from "@/actions/academic-structure";

beforeEach(() => vi.resetAllMocks());

describe("catàleg acadèmic", () => {
  it.each([upsertAcademicEntry, deleteAcademicEntry, reorderAcademicEntry])("exigeix permisos de coordinació", async (action) => {
    const denied = new Error("Access denied");
    requireAdmin.mockRejectedValue(denied);
    await expect(action({ kind: "stage", id: "eso", name: "ESO", direction: "down" })).rejects.toBe(denied);
    expect(db.academicStage.create).not.toHaveBeenCalled();
    expect(db.academicStage.delete).not.toHaveBeenCalled();
    expect(db.academicStage.findMany).not.toHaveBeenCalled();
  });

  it("desa els cursos dins de la seva etapa i actualitza també els desplegables", async () => {
    expect(await upsertAcademicEntry({ kind: "course", parentId: "eso", name: " 2n ", order: "1" })).toEqual({ success: true });
    expect(db.academicCourse.create).toHaveBeenCalledWith({ data: { stageId: "eso", name: "2n", order: 1 } });
    expect(revalidatePath).toHaveBeenCalledWith("/espais");
    expect(revalidatePath).toHaveBeenCalledWith("/alumnat");
  });

  it("no permet editar un grup des d'un altre curs", async () => {
    db.academicGroup.update.mockRejectedValue({ code: "P2025" });
    expect(await upsertAcademicEntry({ kind: "group", id: "b", parentId: "other-course", name: "C" })).toMatchObject({ success: false });
    expect(db.academicGroup.update).toHaveBeenCalledWith({ where: { id: "b", courseId: "other-course" }, data: { name: "C", order: 0 } });
  });

  it("no crea cursos sense etapa ni grups sense curs", async () => {
    expect(await upsertAcademicEntry({ kind: "course", name: "2n" })).toMatchObject({ success: false });
    expect(await upsertAcademicEntry({ kind: "group", parentId: "", name: "B" })).toMatchObject({ success: false });
    expect(db.academicCourse.create).not.toHaveBeenCalled();
    expect(db.academicGroup.create).not.toHaveBeenCalled();
  });

  it("informa de duplicats només en errors d'unicitat", async () => {
    db.academicGroup.create.mockRejectedValue({ code: "P2002" });
    expect(await upsertAcademicEntry({ kind: "group", parentId: "2eso", name: "B" })).toEqual({ success: false, error: "Aquest curs ja té un grup amb aquest nom" });
    const error = new Error("Connection lost");
    db.academicGroup.create.mockRejectedValue(error);
    await expect(upsertAcademicEntry({ kind: "group", parentId: "2eso", name: "B" })).rejects.toBe(error);
  });

  it.each([
    ["stage", "academicStage"], ["course", "academicCourse"], ["group", "academicGroup"],
  ] as const)("protegeix %s quan té elements dependents", async (kind, model) => {
    db[model].delete.mockRejectedValue({ code: "P2003" });
    expect(await deleteAcademicEntry({ kind, id: "in-use" })).toMatchObject({ success: false });
    expect(revalidatePath).not.toHaveBeenCalled();
  });

  it("reordena un grup només dins del seu curs", async () => {
    db.academicGroup.findUnique.mockResolvedValue({ courseId: "2eso" });
    db.academicGroup.findMany.mockResolvedValue([{ id: "a" }, { id: "b" }]);
    expect(await reorderAcademicEntry({ kind: "group", id: "b", direction: "up" })).toEqual({ success: true });
    expect(db.academicGroup.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { courseId: "2eso" } }));
    expect(db.academicGroup.update).toHaveBeenNthCalledWith(1, { where: { id: "b" }, data: { order: 0 } });
    expect(db.academicGroup.update).toHaveBeenNthCalledWith(2, { where: { id: "a" }, data: { order: 1 } });
    expect(db.academicCourse.update).not.toHaveBeenCalled();
    expect(db.$transaction).toHaveBeenCalled();
  });
});
