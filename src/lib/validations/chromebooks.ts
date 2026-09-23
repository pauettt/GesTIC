import { z } from "zod";

import { isBlobUrl } from "@/lib/blob";
import { DEVICE_TYPES } from "@/lib/devices";
import { isDateKey } from "@/lib/validations/common";

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

export const setChromebookOrderSchema = z.object({
  cartId: z.string().min(1),
  // Una llista buida restaura l'ordre alfanumèric automàtic.
  deviceIds: z.array(z.string().min(1)).refine((ids) => new Set(ids).size === ids.length),
});

export const upsertChromebookSchema = z.object({
  id: z.string().optional(),
  // En una edició, canviar-lo és moure l'equip a un altre carro.
  cartId: z.string().min(1, "Tria el carro"),
  assetTag: z.string().trim().min(1, "Indica un identificador").max(100),
  deviceType: z.enum(DEVICE_TYPES),
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

export const setChromebookRetiredSchema = z.object({
  id: z.string().min(1),
  retired: z.boolean(),
});

export const setChromebookAvailabilitySchema = z
  .object({
    id: z.string().min(1),
    available: z.boolean(),
    reason: z.string().trim().max(200, "Com a molt 200 caràcters").optional().or(z.literal("")),
  })
  .refine((value) => value.available || (value.reason ?? "").length >= 3, {
    message: "Explica per què no està disponible",
    path: ["reason"],
  });

export const addChromebookNoteSchema = z.object({
  chromebookId: z.string(),
  body: z.string().trim().min(1, "Escriu una nota").max(1000),
});
export type AddChromebookNoteInput = z.infer<typeof addChromebookNoteSchema>;

export const deleteChromebookNoteSchema = z.object({ id: z.string() });

export const createReservationSchema = z.object({
  cartId: z.string(),
  date: z.string().min(1, "Indica la data").refine(isDateKey, "La data no és vàlida"),
  periodIds: z.array(z.number().int()).min(1, "Selecciona almenys una sessió"),
  purpose: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CreateReservationInput = z.infer<typeof createReservationSchema>;

export const cancelReservationSchema = z.object({ id: z.string() });

// Un equip sol d'un carro, de la sessió `fromPeriodId` a la `toPeriodId` d'un dia.
export const createDeviceReservationSchema = z.object({
  chromebookId: z.string().min(1),
  date: z.string().min(1, "Indica el dia").refine(isDateKey, "La data no és vàlida"),
  fromPeriodId: z.number().int(),
  toPeriodId: z.number().int(),
  purpose: z.string().trim().max(300).optional().or(z.literal("")),
});
export type CreateDeviceReservationInput = z.infer<typeof createDeviceReservationSchema>;

export const deviceReservationIdSchema = z.object({ id: z.string().min(1) });

// Reserva fixa: un carro, un dia de la setmana (1 = dilluns) i una sessió, cada setmana del curs.
export const requestRecurringReservationSchema = z.object({
  cartId: z.string().min(1),
  weekday: z.number().int().min(1, "Tria el dia").max(5, "Tria el dia"),
  periodId: z.number().int(),
  purpose: z.string().trim().min(3, "Explica per a què el necessites").max(300, "Com a molt 300 caràcters"),
});
export type RequestRecurringReservationInput = z.infer<typeof requestRecurringReservationSchema>;

export const decideRecurringReservationSchema = z.object({
  id: z.string().min(1),
  approve: z.boolean(),
  responseNote: z.string().trim().max(500).optional().or(z.literal("")),
});

export const recurringReservationIdSchema = z.object({ id: z.string().min(1) });
