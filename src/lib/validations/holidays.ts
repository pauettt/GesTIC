import { z } from "zod";

import { holidayLength, MAX_HOLIDAY_DAYS } from "@/lib/holidays";
import { isDateKey } from "@/lib/validations/common";

export const createHolidaySchema = z
  .object({
    name: z.string().trim().min(1, "Posa-li un nom, com «Nadal»").max(80, "El nom és massa llarg"),
    startDate: z.string().refine((value) => isDateKey(value), "Tria el primer dia"),
    endDate: z.string().refine((value) => isDateKey(value), "Tria l'últim dia"),
  })
  .refine((holiday) => holiday.startDate <= holiday.endDate, {
    message: "L'últim dia no pot ser abans del primer",
    path: ["endDate"],
  })
  .refine((holiday) => holidayLength(holiday.startDate, holiday.endDate) <= MAX_HOLIDAY_DAYS, {
    message: `Com a molt ${MAX_HOLIDAY_DAYS} dies seguits: si en són més, entra'ls per parts`,
    path: ["endDate"],
  });

export type CreateHolidayInput = z.infer<typeof createHolidaySchema>;

export const deleteHolidaySchema = z.object({ id: z.string().min(1) });
