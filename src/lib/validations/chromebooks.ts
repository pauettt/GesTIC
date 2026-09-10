import { z } from "zod";

import { isBlobUrl } from "@/lib/blob";

export const upsertCartSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom pel carro").max(100),
  serialNumber: z.string().trim().max(150).optional().or(z.literal("")),
  spaceId: z.string().optional().or(z.literal("")),
  imageUrl: z
    .string()
    .refine((value) => !value || isBlobUrl(value), "La imatge no és vàlida")
    .optional()
    .or(z.literal("")),
});
export type UpsertCartInput = z.infer<typeof upsertCartSchema>;

export const deleteCartSchema = z.object({ id: z.string() });

export const upsertChromebookSchema = z.object({
  id: z.string().optional(),
  cartId: z.string(),
  assetTag: z.string().trim().min(1, "Indica un identificador").max(100),
  serialNumber: z.string().trim().max(150).optional().or(z.literal("")),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
});
export type UpsertChromebookInput = z.infer<typeof upsertChromebookSchema>;

export const deleteChromebookSchema = z.object({ id: z.string() });

export const addChromebookNoteSchema = z.object({
  chromebookId: z.string(),
  body: z.string().trim().min(1, "Escriu una nota").max(1000),
});
export type AddChromebookNoteInput = z.infer<typeof addChromebookNoteSchema>;

export const deleteChromebookNoteSchema = z.object({ id: z.string() });

export const createReservationSchema = z.object({
  cartId: z.string(),
  date: z.string().min(1, "Indica la data"),
  periodIds: z.array(z.number().int()).min(1, "Selecciona almenys una sessió"),
  purpose: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const cancelReservationSchema = z.object({ id: z.string() });
