"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteFaqCategorySchema,
  deleteFaqSchema,
  reorderFaqCategorySchema,
  upsertFaqCategorySchema,
  upsertFaqSchema,
} from "@/lib/validations/faq";

export type ActionResult = { success: true } | { success: false; error: string };

export async function upsertFaq(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertFaqSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  const payload = {
    question: data.question,
    answer: data.answer,
    categoryId: data.categoryId,
    order: Number.isNaN(order) ? 0 : order,
  };

  if (data.id) {
    await db.faqEntry.update({ where: { id: data.id }, data: payload });
  } else {
    await db.faqEntry.create({ data: payload });
  }

  revalidatePath("/dubtes");
  return { success: true };
}

export async function deleteFaq(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteFaqSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.faqEntry.delete({ where: { id: parsed.data.id } });
  revalidatePath("/dubtes");
  return { success: true };
}

export async function upsertFaqCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertFaqCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  try {
    if (data.id) {
      await db.faqCategory.update({
        where: { id: data.id },
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    } else {
      await db.faqCategory.create({
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    }
  } catch {
    return { success: false, error: "Ja existeix una categoria amb aquest nom" };
  }

  revalidatePath("/dubtes");
  return { success: true };
}

export async function reorderFaqCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderFaqCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const categories = await db.faqCategory.findMany({
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

  // Reescrivim tot l'índex: així els `order` duplicats que puguin venir d'abans
  // queden normalitzats i l'ordre deixa de dependre del desempat.
  await db.$transaction(
    reordered.map((category, position) =>
      db.faqCategory.update({ where: { id: category.id }, data: { order: position } }),
    ),
  );

  revalidatePath("/dubtes");
  return { success: true };
}

export async function deleteFaqCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteFaqCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  // Les preguntes cauen amb la categoria (onDelete: Cascade): el diàleg avisa
  // de quantes són abans de demanar-ho.
  await db.faqCategory.delete({ where: { id: parsed.data.id } });
  revalidatePath("/dubtes");
  return { success: true };
}
