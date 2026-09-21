import { z } from "zod";

import { CART_SHEET_FIELDS, CHROMEBOOK_FIELDS, type ChromebookField } from "@/lib/chromebook-import";
import { DEVICE_TYPES } from "@/lib/devices";

const column = z.number().int().min(0).max(200).optional();

function mappingSchema<Field extends ChromebookField>(fields: readonly Field[]) {
  return z.object(Object.fromEntries(fields.map((field) => [field, column])) as Record<Field, typeof column>);
}

const sheet = {
  rows: z
    .array(z.array(z.string().max(500)).max(200))
    .min(2, "El full no té cap fila de dades")
    .max(5000, "Com a molt 5.000 files per importació"),
  headerRow: z.number().int().min(0),
  // Sense triar-lo, les files que no diuen el tipus no s'importen.
  defaultDeviceType: z.enum(DEVICE_TYPES).nullable(),
};

export const importChromebooksSchema = z.object({
  ...sheet,
  mapping: mappingSchema(CHROMEBOOK_FIELDS),
  withoutCart: z.enum(["pool", "skip"]),
});
export type ImportChromebooksInput = z.infer<typeof importChromebooksSchema>;

export const importCartChromebooksSchema = z.object({
  ...sheet,
  cartId: z.string().min(1),
  mapping: mappingSchema(CART_SHEET_FIELDS),
});
export type ImportCartChromebooksInput = z.infer<typeof importCartChromebooksSchema>;
