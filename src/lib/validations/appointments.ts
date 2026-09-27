import { z } from "zod";

import { isDateKey } from "@/lib/validations/common";

// L'hora s'identifica pel dia i la sessió de l'horari del centre, no per una
// hora lliure: així no se'n poden obrir de fora de l'horari de l'institut.
export const openAppointmentSlotSchema = z.object({
  date: z.string().min(1, "Indica la data").refine(isDateKey, "La data no és vàlida"),
  periodId: z.number().int(),
  // Qui l'atendrà: cada coordinador és una plaça.
  coordinatorId: z.string().min(1, "Tria qui l'atendrà"),
});

export const closeAppointmentSlotSchema = z.object({ id: z.string() });

export const bookAppointmentSchema = z.object({
  slotId: z.string(),
  purpose: z.string().trim().min(1, "Digues per a què vols l'hora").max(300),
});
export type BookAppointmentInput = z.infer<typeof bookAppointmentSchema>;

export const cancelAppointmentSchema = z.object({ id: z.string() });

// Una hora fixa és un dia de la setmana (1 = dilluns) i una sessió de l'horari,
// d'un coordinador; el curs surt de la data, no del formulari.
export const addAppointmentAvailabilitySchema = z.object({
  coordinatorId: z.string().min(1, "Tria qui l'atendrà"),
  weekday: z.number().int().min(1, "Tria el dia").max(5, "Tria el dia"),
  periodId: z.number().int(),
});

export const removeAppointmentAvailabilitySchema = z.object({ id: z.string().min(1) });
