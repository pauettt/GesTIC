import { z } from "zod";

export const upsertSpaceSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(1, "Indica un nom").max(100),
  building: z.string().trim().max(100).optional().or(z.literal("")),
  floor: z.string().trim().max(50).optional().or(z.literal("")),
});
export type UpsertSpaceInput = z.infer<typeof upsertSpaceSchema>;

export const deleteSpaceSchema = z.object({ id: z.string() });
