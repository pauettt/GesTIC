import { z } from "zod";

export const upsertSpaceSchema = z
  .object({
    id: z.string().optional(),
    number: z.string().trim().max(30),
    roomName: z.string().trim().max(100),
    building: z.string().trim().max(100).optional().or(z.literal("")),
    floor: z.string().trim().max(50).optional().or(z.literal("")),
  })
  .refine((space) => space.number !== "" || space.roomName !== "", {
    message: "Indica el número de l'aula, el nom o tots dos",
    path: ["roomName"],
  });
export type UpsertSpaceInput = z.infer<typeof upsertSpaceSchema>;

export const deleteSpaceSchema = z.object({ id: z.string() });
