import { z } from "zod";

import { isBlobUrl } from "@/lib/blob";

export const upsertInventoryItemSchema = z.object({
  id: z.string().optional(),
  categoryId: z.string().min(1, "Selecciona una categoria"),
  imageUrl: z
    .string()
    .refine((value) => !value || isBlobUrl(value), "La imatge no és vàlida")
    .optional()
    .or(z.literal("")),
  brand: z.string().trim().min(1, "Indica la marca").max(100),
  model: z.string().trim().min(1, "Indica el model").max(100),
  serialNumber: z.string().trim().max(150).optional().or(z.literal("")),
  spaceId: z.string().optional().or(z.literal("")),
  status: z.enum(["ACTIU", "EN_REPARACIO", "BAIXA"]),
  isLoanable: z.boolean(),
  purchaseDate: z.string().optional().or(z.literal("")),
  warrantyUntil: z.string().optional().or(z.literal("")),
  notes: z.string().trim().max(2000).optional().or(z.literal("")),
});

export type UpsertInventoryItemInput = z.infer<typeof upsertInventoryItemSchema>;

export const deleteInventoryItemSchema = z.object({ id: z.string() });

export const upsertInventoryCategorySchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});
export type UpsertInventoryCategoryInput = z.infer<typeof upsertInventoryCategorySchema>;

export const deleteInventoryCategorySchema = z.object({ id: z.string() });

export const reorderInventoryCategorySchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});
