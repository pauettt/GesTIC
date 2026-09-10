import { z } from "zod";

import { isBlobUrl } from "@/lib/blob";

export const createIncidentSchema = z
  .object({
    // Obligatori per a incidències d'aula (INVENTORY_ITEM/GENERAL); els carros i
    // Chromebooks canvien d'aula sovint, així que per a ells és opcional.
    spaceId: z.string().optional(),
    description: z.string().trim().min(10, "Descriu la incidència amb una mica més de detall").max(4000),
    priority: z.enum(["BAIXA", "MITJANA", "ALTA"]),
    targetType: z.enum(["INVENTORY_ITEM", "CHROMEBOOK", "CART", "GOOGLE_WORKSPACE", "GENERAL"]),
    category: z.enum(["PANTALLA", "TECLAT", "TOUCHPAD", "WIFI_INTERNET", "NO_S_ENCEN", "ALTRE"]).optional(),
    inventoryItemId: z.string().optional(),
    chromebookId: z.string().optional(),
    cartId: z.string().optional(),
    googleService: z
      .enum(["CLASSROOM", "COMPTE", "GMAIL", "DRIVE", "MEET", "CALENDAR", "YOUTUBE", "CHROME", "ALTRE"])
      .optional(),
    // Fotos fetes en el moment de reportar. Mateixa restricció que els adjunts:
    // només fitxers del nostre blob store.
    photoUrls: z.array(z.string().refine(isBlobUrl, "La imatge no és vàlida")).max(2).optional(),
  })
  .refine(
    (data) => {
      if (data.targetType === "INVENTORY_ITEM") return Boolean(data.inventoryItemId);
      if (data.targetType === "CHROMEBOOK") return Boolean(data.chromebookId);
      if (data.targetType === "CART") return Boolean(data.cartId);
      return true;
    },
    { message: "Selecciona l'objecte afectat", path: ["inventoryItemId"] },
  )
  .refine((data) => data.targetType !== "GOOGLE_WORKSPACE" || Boolean(data.googleService), {
    message: "Selecciona el servei de Google afectat",
    path: ["googleService"],
  })
  .refine(
    (data) => {
      if (data.targetType === "INVENTORY_ITEM" || data.targetType === "GENERAL") {
        return Boolean(data.spaceId);
      }
      return true;
    },
    { message: "Selecciona l'aula", path: ["spaceId"] },
  );

export type CreateIncidentInput = z.infer<typeof createIncidentSchema>;

export const addCommentSchema = z.object({
  incidentId: z.string(),
  body: z.string().trim().min(1, "Escriu un comentari").max(2000),
});

export const updateIncidentStatusSchema = z.object({
  incidentId: z.string(),
  status: z.enum(["OBERTA", "EN_CURS", "RESOLTA", "TANCADA"]),
  // Nota opcional en resoldre: es desa com a comentari del fil i s'inclou al
  // correu d'avís que rep qui va reportar la incidència.
  note: z.string().trim().max(2000).optional().or(z.literal("")),
});

export const updateIncidentPrioritySchema = z.object({
  incidentId: z.string(),
  priority: z.enum(["BAIXA", "MITJANA", "ALTA"]),
});

export const assignIncidentSchema = z.object({
  incidentId: z.string(),
  assignedToId: z.string().nullable(),
});

export const quickChromebookIncidentSchema = z.object({
  chromebookId: z.string(),
  category: z.enum(["PANTALLA", "TECLAT", "TOUCHPAD", "WIFI_INTERNET", "NO_S_ENCEN", "ALTRE"]),
});
export type QuickChromebookIncidentInput = z.infer<typeof quickChromebookIncidentSchema>;

export const attachIncidentFileSchema = z.object({
  incidentId: z.string().min(1),
  url: z.string().refine(isBlobUrl, "L'enllaç del fitxer no és vàlid"),
  filename: z.string().trim().min(1).max(255),
});
