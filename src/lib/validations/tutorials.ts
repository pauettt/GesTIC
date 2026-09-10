import { z } from "zod";

export const upsertTutorialCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertTutorialCategoryInput = z.infer<typeof upsertTutorialCategorySchema>;

export const deleteTutorialCategorySchema = z.object({ id: z.string() });

export const upsertTutorialArticleSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Selecciona una categoria"),
  title: z.string().trim().min(3, "Indica un títol").max(150),
  contentMarkdown: z.string().trim().min(10, "Escriu el contingut del tutorial").max(20000),
});
export type UpsertTutorialArticleInput = z.infer<typeof upsertTutorialArticleSchema>;

export const deleteTutorialArticleSchema = z.object({ id: z.string() });

export const reorderTutorialCategorySchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});
