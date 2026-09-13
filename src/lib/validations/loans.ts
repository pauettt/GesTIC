import { z } from "zod";

import { isDateKey } from "@/lib/validations/common";

export const createLoanRequestSchema = z
  .object({
    itemId: z.string().min(1),
    startDate: z
      .string()
      .min(1, "Indica la data d'inici")
      .refine(isDateKey, "La data d'inici no és vàlida"),
    endDate: z
      .string()
      .min(1, "Indica la data de retorn")
      .refine(isDateKey, "La data de retorn no és vàlida"),
    purpose: z.string().trim().max(500).optional().or(z.literal("")),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: "La data de retorn ha de ser igual o posterior a la d'inici",
    path: ["endDate"],
  });

export type CreateLoanRequestInput = z.infer<typeof createLoanRequestSchema>;

export const respondLoanRequestSchema = z.object({
  id: z.string().min(1),
  status: z.enum(["APROVADA", "REBUTJADA"]),
  responseNote: z.string().trim().max(500).optional().or(z.literal("")),
});
export type RespondLoanRequestInput = z.infer<typeof respondLoanRequestSchema>;

export const cancelLoanRequestSchema = z.object({ id: z.string().min(1) });

export const markLoanReturnedSchema = z.object({ id: z.string().min(1) });
