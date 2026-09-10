"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteTutorialArticleSchema,
  deleteTutorialCategorySchema,
  reorderTutorialCategorySchema,
  upsertTutorialArticleSchema,
  upsertTutorialCategorySchema,
} from "@/lib/validations/tutorials";

export type ActionResult = { success: true } | { success: false; error: string };

function slugify(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function upsertTutorialCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertTutorialCategorySchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;
  const order = data.order ? Number(data.order) : 0;

  try {
    if (data.id) {
      await db.tutorialCategory.update({
        where: { id: data.id },
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    } else {
      await db.tutorialCategory.create({
        data: { name: data.name, order: Number.isNaN(order) ? 0 : order },
      });
    }
  } catch {
    return { success: false, error: "Ja existeix una categoria amb aquest nom" };
  }

  revalidatePath("/tutorials");
  return { success: true };
}

export async function reorderTutorialCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = reorderTutorialCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };
  const { id, direction } = parsed.data;

  const categories = await db.tutorialCategory.findMany({
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
      db.tutorialCategory.update({ where: { id: category.id }, data: { order: position } }),
    ),
  );

  revalidatePath("/tutorials");
  return { success: true };
}

export async function deleteTutorialCategory(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteTutorialCategorySchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.tutorialCategory.delete({ where: { id: parsed.data.id } });
  revalidatePath("/tutorials");
  return { success: true };
}

export async function upsertTutorialArticle(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertTutorialArticleSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const data = parsed.data;

  if (data.id) {
    await db.tutorialArticle.update({
      where: { id: data.id },
      data: {
        categoryId: data.categoryId,
        title: data.title,
        contentMarkdown: data.contentMarkdown,
      },
    });
  } else {
    const baseSlug = slugify(data.title) || "tutorial";
    let slug = baseSlug;
    let suffix = 1;
    while (await db.tutorialArticle.findUnique({ where: { slug } })) {
      suffix += 1;
      slug = `${baseSlug}-${suffix}`;
    }
    await db.tutorialArticle.create({
      data: {
        categoryId: data.categoryId,
        title: data.title,
        contentMarkdown: data.contentMarkdown,
        slug,
      },
    });
  }

  revalidatePath("/tutorials");
  return { success: true };
}

export async function deleteTutorialArticle(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteTutorialArticleSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.tutorialArticle.delete({ where: { id: parsed.data.id } });
  revalidatePath("/tutorials");
  return { success: true };
}
