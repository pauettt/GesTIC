"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import { spaceName } from "@/lib/spaces";
import { deleteSpaceSchema, upsertSpaceSchema } from "@/lib/validations/space";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertSpaceSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, number, roomName, building, floor } = parsed.data;
  const data = {
    name: spaceName({ number, roomName }),
    number: number || null,
    roomName: roomName || null,
    building: building || null,
    floor: floor || null,
  };

  try {
    if (id) {
      await db.space.update({ where: { id }, data });
    } else {
      await db.space.create({ data });
    }
  } catch {
    return { success: false, error: "Ja hi ha un espai amb aquest número o aquest nom" };
  }

  revalidatePath("/espais");
  revalidatePath("/panell");
  return { success: true };
}

export async function deleteSpace(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteSpaceSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.space.delete({ where: { id: parsed.data.id } });
  revalidatePath("/espais");
  revalidatePath("/panell");
  return { success: true };
}
