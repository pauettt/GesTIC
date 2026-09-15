import { z } from "zod";

import { CHROMEBOOK_FIELDS, type ChromebookField } from "@/lib/chromebook-import";

const column = z.number().int().min(0).max(200).optional();

export const importChromebooksSchema = z.object({
  rows: z
    .array(z.array(z.string().max(500)).max(200))
    .min(2, "El full no té cap fila de dades")
    .max(5000, "Com a molt 5.000 files per importació"),
  headerRow: z.number().int().min(0),
  mapping: z.object(
    Object.fromEntries(CHROMEBOOK_FIELDS.map((field) => [field, column])) as Record<ChromebookField, typeof column>,
  ),
  withoutCart: z.enum(["pool", "skip"]),
});
export type ImportChromebooksInput = z.infer<typeof importChromebooksSchema>;
