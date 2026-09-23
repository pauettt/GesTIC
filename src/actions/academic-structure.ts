"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteAcademicEntrySchema,
  reorderAcademicEntrySchema,
  upsertAcademicEntrySchema,
} from "@/lib/validations/academic-structure";

type ActionResult = { success: true } | { success: false; error: string };

function prismaCode(error: unknown) {
  return typeof error === "object" && error !== null && "code" in error ? error.code : undefined;
}

function refresh() {
  revalidatePath("/espais");
  revalidatePath("/alumnat");
}

export async function upsertAcademicEntry(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertAcademicEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  const entry = parsed.data;
  const { id, name, order } = entry;
  const data = { name, order };

  try {
    switch (entry.kind) {
      case "stage":
        if (id) await db.academicStage.update({ where: { id }, data });
        else await db.academicStage.create({ data });
        break;
      case "course":
        // Canviar-ne el nom no mou el curs a una altra etapa.
        if (id) await db.academicCourse.update({ where: { id, stageId: entry.parentId }, data });
        else await db.academicCourse.create({ data: { ...data, stageId: entry.parentId } });
        break;
      case "group":
        if (id) await db.academicGroup.update({ where: { id, courseId: entry.parentId }, data });
        else await db.academicGroup.create({ data: { ...data, courseId: entry.parentId } });
        break;
    }
  } catch (error) {
    if (prismaCode(error) === "P2002") {
      const message = {
        stage: "Ja existeix una etapa amb aquest nom",
        course: "Aquesta etapa ja té un curs amb aquest nom",
        group: "Aquest curs ja té un grup amb aquest nom",
      }[entry.kind];
      return { success: false, error: message };
    }
    if (prismaCode(error) === "P2003" || prismaCode(error) === "P2025") {
      return { success: false, error: "L'etapa, el curs o el grup ja no existeixen: torna a obrir el diàleg" };
    }
    throw error;
  }
  refresh();
  return { success: true };
}

export async function deleteAcademicEntry(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteAcademicEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { kind, id } = parsed.data;
  try {
    switch (kind) {
      case "stage": await db.academicStage.delete({ where: { id } }); break;
      case "course": await db.academicCourse.delete({ where: { id } }); break;
      case "group": await db.academicGroup.delete({ where: { id } }); break;
    }
  } catch (error) {
    if (prismaCode(error) === "P2003") {
      const message = {
        stage: "No es pot eliminar una etapa que encara té cursos",
        course: "No es pot eliminar un curs que encara té grups",
        group: "No es pot eliminar un grup amb sol·licituds d'alumnat",
      }[kind];
      return { success: false, error: message };
    }
    if (prismaCode(error) !== "P2025") throw error;
  }
  refresh();
  return { success: true };
}

export async function reorderAcademicEntry(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderAcademicEntrySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { kind, id, direction } = parsed.data;
  const query = { orderBy: [{ order: "asc" }, { name: "asc" }], select: { id: true } } as const;
  let items: { id: string }[];
  // L'ordre és dins del mateix pare, mai entre etapes o cursos diferents.
  if (kind === "stage") {
    items = await db.academicStage.findMany({ ...query, orderBy: [...query.orderBy] });
  } else if (kind === "course") {
    const course = await db.academicCourse.findUnique({ where: { id }, select: { stageId: true } });
    if (!course) return { success: false, error: "El curs ja no existeix" };
    items = await db.academicCourse.findMany({ ...query, orderBy: [...query.orderBy], where: { stageId: course.stageId } });
  } else {
    const group = await db.academicGroup.findUnique({ where: { id }, select: { courseId: true } });
    if (!group) return { success: false, error: "El grup ja no existeix" };
    items = await db.academicGroup.findMany({ ...query, orderBy: [...query.orderBy], where: { courseId: group.courseId } });
  }
  const index = items.findIndex((item) => item.id === id);
  if (index < 0) return { success: false, error: "L'element ja no existeix" };
  const target = index + (direction === "up" ? -1 : 1);
  if (target < 0 || target >= items.length) return { success: true };
  [items[index], items[target]] = [items[target], items[index]];

  await db.$transaction(items.map((item, order) => {
    const update = { where: { id: item.id }, data: { order } };
    switch (kind) {
      case "stage": return db.academicStage.update(update);
      case "course": return db.academicCourse.update(update);
      case "group": return db.academicGroup.update(update);
    }
  }));
  refresh();
  return { success: true };
}
