import { z } from "zod";

export const upsertFaqSchema = z.object({
  id: z.string().optional(),
  question: z.string().trim().min(5, "Escriu la pregunta").max(300),
  answer: z.string().trim().min(5, "Escriu la resposta").max(3000),
  category: z.string().trim().min(1, "Indica una categoria").max(100),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertFaqInput = z.infer<typeof upsertFaqSchema>;

export const deleteFaqSchema = z.object({ id: z.string() });
