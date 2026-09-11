import { z } from "zod";

export const upsertConciergeSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2, "Escriu el nom del conserge").max(60),
});
export type UpsertConciergeInput = z.infer<typeof upsertConciergeSchema>;

export const setConciergeActiveSchema = z.object({
  id: z.string().min(1),
  active: z.boolean(),
});

export const upsertKeySchema = z.object({
  id: z.string().optional(),
  number: z.string().trim().min(1, "Cada clau ha de tenir un número").max(20),
  name: z.string().trim().min(2, "Escriu a què obre la clau").max(80),
  // Les claus dels carros hereten les reserves; la resta (aules, magatzems) no
  // en tenen cap i simplement estan fora o no.
  cartId: z.string().optional(),
  copies: z.number().int().min(1, "Com a mínim una còpia").max(10),
  notes: z.string().trim().max(300).optional(),
});
export type UpsertKeyInput = z.infer<typeof upsertKeySchema>;

export const deleteKeySchema = z.object({ id: z.string().min(1) });

export const deliverKeySchema = z.object({
  keyId: z.string().min(1),
  borrowerId: z.string().min(1, "Tria el professor/a"),
  deliveredById: z.string().min(1, "Tria quin conserge entrega la clau"),
  reservationId: z.string().optional(),
  // Només per a les entregues sense reserva: una urgència, un substitut...
  reason: z.string().trim().max(200).optional(),
});
export type DeliverKeyInput = z.infer<typeof deliverKeySchema>;

export const returnKeySchema = z.object({ loanId: z.string().min(1) });

export const remindKeySchema = z.object({
  loanId: z.string().min(1),
  remindedById: z.string().min(1, "Tria qui envia l'avís"),
});
