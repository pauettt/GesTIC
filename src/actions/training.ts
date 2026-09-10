"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { zonedDateTimeFromLocal } from "@/lib/date";
import { requireAdmin, requireUser } from "@/lib/permissions";
import {
  deleteTrainingSessionSchema,
  enrollmentSchema,
  upsertTrainingSessionSchema,
} from "@/lib/validations/training";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertTrainingSession(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertTrainingSessionSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const capacity = data.capacity ? Number(data.capacity) : null;

  const payload = {
    title: data.title,
    description: data.description,
    date: zonedDateTimeFromLocal(data.date),
    spaceId: data.spaceId || null,
    capacity: capacity && !Number.isNaN(capacity) ? capacity : null,
    materialsUrl: data.materialsUrl ? [data.materialsUrl] : [],
  };

  if (data.id) {
    await db.trainingSession.update({ where: { id: data.id }, data: payload });
  } else {
    await db.trainingSession.create({ data: payload });
  }

  revalidatePath("/formacio");
  return { success: true };
}

export async function deleteTrainingSession(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteTrainingSessionSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.trainingSession.delete({ where: { id: parsed.data.id } });
  revalidatePath("/formacio");
  return { success: true };
}

export async function enrollInSession(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = enrollmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  const { sessionId } = parsed.data;

  try {
    await db.$transaction(async (tx) => {
      // Bloqueig de la fila de la sessió: si dos professors s'inscriuen alhora
      // a l'última plaça, el segon espera aquí i quan continua ja veu el
      // comptador actualitzat. Sense això tots dos passarien la comprovació.
      const locked = await tx.$queryRaw<{ id: string; capacity: number | null }[]>`
        SELECT "id", "capacity" FROM "TrainingSession" WHERE "id" = ${sessionId} FOR UPDATE
      `;
      if (locked.length === 0) throw new Error("La sessió no existeix");

      const { capacity } = locked[0];
      if (capacity !== null) {
        const taken = await tx.trainingEnrollment.count({ where: { sessionId } });
        if (taken >= capacity) throw new Error("Ja no queden places lliures");
      }

      await tx.trainingEnrollment.create({ data: { sessionId, userId: user.id } });
    });
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      return { success: false, error: "Ja estàs inscrit/a en aquesta sessió" };
    }
    return {
      success: false,
      error: error instanceof Error ? error.message : "No s'ha pogut fer la inscripció",
    };
  }

  revalidatePath("/formacio");
  return { success: true };
}

export async function unenrollFromSession(input: unknown): Promise<ActionResult> {
  const user = await requireUser();
  const parsed = enrollmentSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.trainingEnrollment.deleteMany({
    where: { sessionId: parsed.data.sessionId, userId: user.id },
  });

  revalidatePath("/formacio");
  return { success: true };
}
