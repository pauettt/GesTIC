"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { deleteSpaceSchema, upsertSpaceSchema } from "@/lib/validations/space";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, name, building, floor } = parsed.data;

  try {
    if (id) {
      await db.space.update({ where: { id }, data: { name, building: building || null, floor: floor || null } });
    } else {
      await db.space.create({ data: { name, building: building || null, floor: floor || null } });
    }
  } catch {
    return { success: false, error: "Ja existeix un espai amb aquest nom" };
  }

  revalidatePath("/panell");
  return { success: true };
}

export async function deleteSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteSpaceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.space.delete({ where: { id: parsed.data.id } });
  revalidatePath("/panell");
  return { success: true };
}
