import { z } from "zod";

const item = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1, "Indica un nom").max(80, "Com a molt 80 caràcters"),
  order: z.string().regex(/^\d*$/, "L'ordre ha de ser un número positiu").optional()
    .transform((value) => Number(value || 0)).pipe(z.number().int().min(0).max(10000)),
});

export const upsertAcademicEntrySchema = z.discriminatedUnion("kind", [
  item.extend({ kind: z.literal("stage") }),
  item.extend({ kind: z.literal("course"), parentId: z.string().min(1, "Tria l'etapa") }),
  item.extend({ kind: z.literal("group"), parentId: z.string().min(1, "Tria el curs") }),
]);

export const deleteAcademicEntrySchema = z.object({
  kind: z.enum(["stage", "course", "group"]),
  id: z.string().min(1),
});

export const reorderAcademicEntrySchema = deleteAcademicEntrySchema.extend({
  direction: z.enum(["up", "down"]),
});
