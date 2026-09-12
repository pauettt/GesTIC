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

// Els equips del pool de préstec a l'alumnat no van a cap carro, per això aquí
// no hi ha `cartId`. El número de sèrie hi és obligatori, a diferència dels de
// carro: aquests surten del centre amb una família, i si s'ha de reclamar o
// donar de baixa un aparell, el que l'identifica de debò és la sèrie i no
// l'etiqueta que li hem posat nosaltres.
export const upsertStudentChromebookSchema = z.object({
  id: z.string().optional(),
  assetTag: z.string().trim().min(1, "Indica un identificador").max(100),
  serialNumber: z.string().trim().min(1, "Indica el número de sèrie").max(150),
  brand: z.string().trim().max(100).optional().or(z.literal("")),
  model: z.string().trim().max(100).optional().or(z.literal("")),
});
export type UpsertStudentChromebookInput = z.infer<typeof upsertStudentChromebookSchema>;

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
