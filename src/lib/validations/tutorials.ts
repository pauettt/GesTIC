import { z } from "zod";

import { parseYoutubeId } from "@/lib/youtube";

export const upsertTutorialCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertTutorialCategoryInput = z.infer<typeof upsertTutorialCategorySchema>;

export const deleteTutorialCategorySchema = z.object({ id: z.string() });

export const reorderTutorialCategorySchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});

/** Enllaç d'un vídeo de YouTube, en qualsevol dels formats que es copien del web. */
export const youtubeUrlSchema = z
  .string()
  .trim()
  .refine((value) => parseYoutubeId(value) !== null, "Enganxa l'enllaç d'un vídeo de YouTube");

export const upsertTutorialVideoSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Selecciona una categoria"),
  url: youtubeUrlSchema,
  title: z.string().trim().min(3, "Indica un títol").max(150),
  description: z.string().trim().max(300, "Com a molt 300 caràcters").optional().or(z.literal("")),
});
export type UpsertTutorialVideoInput = z.infer<typeof upsertTutorialVideoSchema>;

export const deleteTutorialVideoSchema = z.object({ id: z.string() });
