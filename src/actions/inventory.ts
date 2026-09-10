"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteInventoryCategorySchema,
  deleteInventoryItemSchema,
  reorderInventoryCategorySchema,
  upsertInventoryCategorySchema,
  upsertInventoryItemSchema,
} from "@/lib/validations/inventory";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertInventoryItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertInventoryItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;

  const payload = {
    categoryId: data.categoryId,
    brand: data.brand,
    model: data.model,
    serialNumber: data.serialNumber || null,
    spaceId: data.spaceId || null,
    status: data.status,
    isLoanable: data.isLoanable,
    imageUrl: data.imageUrl || null,
    purchaseDate: data.purchaseDate ? new Date(data.purchaseDate) : null,
    warrantyUntil: data.warrantyUntil ? new Date(data.warrantyUntil) : null,
    notes: data.notes || null,
  };

  try {
    if (data.id) {
      await db.inventoryItem.update({ where: { id: data.id }, data: payload });
    } else {
      await db.inventoryItem.create({ data: payload });
    }
  } catch {
    return { success: false, error: "El número de sèrie ja existeix a l'inventari" };
  }

  revalidatePath("/inventari");
  return { success: true };
}

export async function deleteInventoryItem(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteInventoryItemSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: "Dades no vàlides" };
  }

  await db.inventoryItem.delete({ where: { id: parsed.data.id } });
  revalidatePath("/inventari");
  return { success: true };
}

export async function upsertInventoryCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertInventoryCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  try {
    if (data.id) {
      await db.inventoryCategory.update({
        where: { id: data.id },
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    } else {
      await db.inventoryCategory.create({
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    }
  } catch {
    return { success: false, error: "Ja existeix una categoria amb aquest nom" };
  }

  revalidatePath("/inventari");
  return { success: true };
}

export async function reorderInventoryCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderInventoryCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const categories = await db.inventoryCategory.findMany({
    orderBy: [{ order: "asc" }, { name: "asc" }],
    select: { id: true },
  });
  const index = categories.findIndex((category) => category.id === id);
  if (index === -1) return { success: false, error: "La categoria ja no existeix" };

  const target = direction === "up" ? index - 1 : index + 1;
  // Ja és a l'extrem: no és un error, simplement no hi ha res a moure.
  if (target < 0 || target >= categories.length) return { success: true };

  const reordered = [...categories];
  [reordered[index], reordered[target]] = [reordered[target], reordered[index]];

  // Reescrivim tot l'índex: així els `order` duplicats que puguin venir
  // d'abans queden normalitzats i l'ordre deixa de dependre del desempat.
  await db.$transaction(
    reordered.map((category, position) =>
      db.inventoryCategory.update({ where: { id: category.id }, data: { order: position } }),
    ),
  );

  revalidatePath("/inventari");
  return { success: true };
}

export async function deleteInventoryCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteInventoryCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  try {
    await db.inventoryCategory.delete({ where: { id: parsed.data.id } });
  } catch {
    return {
      success: false,
      error: "No es pot eliminar: encara hi ha equips assignats a aquesta categoria",
    };
  }

  revalidatePath("/inventari");
  return { success: true };
}
