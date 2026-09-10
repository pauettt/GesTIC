import { z } from "zod";

export const createQuerySchema = z.object({
  title: z.string().trim().min(5, "El títol ha de tenir almenys 5 caràcters").max(150),
  description: z.string().trim().min(10, "Explica la teva consulta amb una mica més de detall").max(4000),
});
export type CreateQueryInput = z.infer<typeof createQuerySchema>;

export const addQueryCommentSchema = z.object({
  queryId: z.string(),
  body: z.string().trim().min(1, "Escriu un comentari").max(2000),
});

export const updateQueryStatusSchema = z.object({
  queryId: z.string(),
  status: z.enum(["OBERTA", "EN_CURS", "RESOLTA", "TANCADA"]),
});
