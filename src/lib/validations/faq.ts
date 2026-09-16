import { z } from "zod";

export const upsertFaqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(5, "Escriu la pregunta").max(300),
  answer: z.string().trim().min(5, "Escriu la resposta").max(3000),
  categoryId: z.string().min(1, "Tria una categoria"),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertFaqInput = z.infer<typeof upsertFaqSchema>;

export const deleteFaqSchema = z.object({ id: z.string() });

export const upsertFaqCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertFaqCategoryInput = z.infer<typeof upsertFaqCategorySchema>;

export const deleteFaqCategorySchema = z.object({ id: z.string() });

export const reorderFaqCategorySchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});
