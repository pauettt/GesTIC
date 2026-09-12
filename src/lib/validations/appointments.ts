import { z } from "zod";

// L'hora s'identifica pel dia i la sessió de l'horari del centre, no per una
// hora lliure: així no se'n poden obrir de fora de l'horari de l'institut.
export const openAppointmentSlotSchema = z.object({
  date: z.string().min(1, "Indica la data"),
  periodId: z.number().int(),
});

export const closeAppointmentSlotSchema = z.object({ id: z.string() });

export const bookAppointmentSchema = z.object({
  slotId: z.string(),
  purpose: z.string().trim().min(1, "Digues per a què vols l'hora").max(300),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const cancelAppointmentSchema = z.object({ id: z.string() });
