import { z } from "zod";

export const upsertTrainingSessionSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(3, "Indica un títol").max(150),
  description: z.string().trim().min(10, "Afegeix una mica més de descripció").max(3000),
  date: z.string().min(1, "Indica la data i hora"),
  spaceId: z.string().optional().or(z.literal("")),
  capacity: z.string().optional().or(z.literal("")),
  // L'enllaç es renderitza com a href a /formacio: cal exigir http(s) perquè no
  // s'hi pugui colar un `javascript:`.
  materialsUrl: z
    .string()
    .trim()
    .max(500)
    .refine((value) => {
      if (!value) return true;
      try {
        return ["http:", "https:"].includes(new URL(value).protocol);
      } catch {
        return false;
      }
    }, "Ha de ser un enllaç http o https")
    .optional()
    .or(z.literal("")),
});
export type UpsertTrainingSessionInput = z.infer<typeof upsertTrainingSessionSchema>;

export const deleteTrainingSessionSchema = z.object({ id: z.string() });

export const enrollmentSchema = z.object({ sessionId: z.string() });
