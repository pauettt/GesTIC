import { z } from "zod";

export const upsertSpaceSchema = z
  .object({
    id: z.string().optional(),
    number: z.string().trim().max(30),
    roomName: z.string().trim().max(100),
    buildingId: z.string().optional().or(z.literal("")),
    floorId: z.string().optional().or(z.literal("")),
  })
  .refine((space) => space.number !== "" || space.roomName !== "", {
    message: "Indica el número de l'aula, el nom o tots dos",
    path: ["roomName"],
  });
export type UpsertSpaceInput = z.infer<typeof upsertSpaceSchema>;

export const deleteSpaceSchema = z.object({ id: z.string() });

// Els edificis i les plantes són llistes iguals: un nom i un ordre.
const upsertListItemSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  order: z.string().optional().or(z.literal("")),
});
const deleteListItemSchema = z.object({ id: z.string() });
const reorderListItemSchema = z.object({
  id: z.string(),
  direction: z.enum(["up", "down"]),
});

export const upsertBuildingSchema = upsertListItemSchema;
export const deleteBuildingSchema = deleteListItemSchema;
export const reorderBuildingSchema = reorderListItemSchema;

export const upsertFloorSchema = upsertListItemSchema;
export const deleteFloorSchema = deleteListItemSchema;
export const reorderFloorSchema = reorderListItemSchema;
