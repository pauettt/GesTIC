"use server";

import { revalidatePath } from "next/cache";

import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/permissions";
import {
  deleteTutorialCategorySchema,
  deleteTutorialVideoSchema,
  reorderTutorialCategorySchema,
  upsertTutorialCategorySchema,
  upsertTutorialVideoSchema,
  youtubeUrlSchema,
} from "@/lib/validations/tutorials";
import { lookupYoutubeVideo, parseYoutubeId } from "@/lib/youtube";

export type ActionResult = { success: true } | { success: false; error: string };
export type LookupResult = { success: true; title: string } | { success: false; error: string };

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

/**
 * Títol d'un vídeo, per omplir el formulari mentre s'afegeix. Només per a la
 * coordinació: si no, gesTIC faria de pont cap a YouTube per a qualsevol.
 */
export async function lookupTutorialVideo(input: unknown): Promise<LookupResult> {
  await requireAdmin();
  const parsed = youtubeUrlSchema.safeParse(input);
  const youtubeId = parsed.success ? parseYoutubeId(parsed.data) : null;
  if (!youtubeId) return { success: false, error: "Enganxa l'enllaç d'un vídeo de YouTube" };

  const lookup = await lookupYoutubeVideo(youtubeId);
  return lookup.ok ? { success: true, title: lookup.title } : { success: false, error: lookup.error };
}

export async function upsertTutorialVideo(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = upsertTutorialVideoSchema.safeParse(input);
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0]?.message ?? "Dades no vàlides" };
  }
  const { id, categoryId, url, title, description } = parsed.data;
  const youtubeId = parseYoutubeId(url);
  if (!youtubeId) return { success: false, error: "Enganxa l'enllaç d'un vídeo de YouTube" };

  const current = id
    ? await db.tutorialVideo.findUnique({ where: { id }, select: { youtubeId: true } })
    : null;
  if (id && !current) return { success: false, error: "Aquest vídeo ja no és als tutorials" };

  // Cada enllaç nou es comprova a YouTube aquí i no només al formulari: un vídeo
  // privat o esborrat no ha d'arribar a la llista.
  if (current?.youtubeId !== youtubeId) {
    const lookup = await lookupYoutubeVideo(youtubeId);
    if (!lookup.ok) return { success: false, error: lookup.error };
  }

  const data = { categoryId, youtubeId, title, description: description || null };
  try {
    if (id) {
      await db.tutorialVideo.update({ where: { id }, data });
    } else {
      await db.tutorialVideo.create({ data });
    }
  } catch (error) {
    // P2002: el vídeo ja hi és, potser en una altra categoria.
    if (typeof error === "object" && error !== null && "code" in error && error.code === "P2002") {
      const existing = await db.tutorialVideo.findUnique({
        where: { youtubeId },
        select: { category: { select: { name: true } } },
      });
      return {
        success: false,
        error: existing
          ? `Aquest vídeo ja és als tutorials, a «${existing.category.name}»`
          : "Aquest vídeo ja és als tutorials",
      };
    }
    throw error;
  }

  revalidatePath("/tutorials");
  return { success: true };
}

export async function deleteTutorialVideo(input: unknown): Promise<ActionResult> {
  await requireAdmin();
  const parsed = deleteTutorialVideoSchema.safeParse(input);
  if (!parsed.success) return { success: false, error: "Dades no vàlides" };

  await db.tutorialVideo.deleteMany({ where: { id: parsed.data.id } });
  revalidatePath("/tutorials");
  return { success: true };
}
