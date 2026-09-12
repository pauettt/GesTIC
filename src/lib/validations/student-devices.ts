import { z } from "zod";

const note = z.string().trim().max(500).optional().or(z.literal(""));

/**
 * El motiu és una llista tancada i el comentari només serveix per matisar-lo:
 * un camp obert en una fitxa d'un menor convida a escriure-hi coses que després
 * no caldria tenir desades. A "Un altre motiu" sí que cal explicar-se, perquè
 * si no la coordinació no té res per decidir.
 */
export const createStudentDeviceRequestSchema = z
  .object({
    studentFirstName: z.string().trim().min(1, "Indica el nom de l'alumne/a").max(80),
    studentLastName: z.string().trim().min(1, "Indica els cognoms de l'alumne/a").max(120),
    groupName: z.string().trim().max(40).optional().or(z.literal("")),
    reason: z.enum([
      "SENSE_DISPOSITIU",
      "DISPOSITIU_AVARIAT",
      "NECESSITAT_EDUCATIVA",
      "ALTRE",
    ]),
    reasonNote: note,
  })
  .refine((data) => data.reason !== "ALTRE" || Boolean(data.reasonNote), {
    message: "Si tries «Un altre motiu», explica'l breument",
    path: ["reasonNote"],
  });
export type CreateStudentDeviceRequestInput = z.infer<typeof createStudentDeviceRequestSchema>;

/**
 * Unió discriminada i no un objecte amb tot opcional: aprovar vol dir assignar
 * un equip, i així no hi ha manera d'aprovar-ne cap sense dir-ne quin.
 */
export const respondStudentDeviceRequestSchema = z.discriminatedUnion("status", [
  z.object({
    id: z.string().min(1),
    status: z.literal("APROVADA"),
    chromebookId: z.string().min(1, "Tria quin equip se li assigna"),
    responseNote: note,
  }),
  z.object({
    id: z.string().min(1),
    status: z.literal("REBUTJADA"),
    responseNote: note,
  }),
]);
export type RespondStudentDeviceRequestInput = z.infer<typeof respondStudentDeviceRequestSchema>;

export const cancelStudentDeviceRequestSchema = z.object({ id: z.string().min(1) });

export const markStudentDeviceReturnedSchema = z.object({ id: z.string().min(1) });
