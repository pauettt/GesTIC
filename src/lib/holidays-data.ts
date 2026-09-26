import { cache } from "react";

import { madridDateKey } from "@/lib/date";
import { db } from "@/lib/db";
import { holidayOn, type Holiday } from "@/lib/holidays";

/**
 * Tots els festius, per ordre. N'hi ha una desena per curs: es filtren a
 * `holidayOn` i no a la consulta. `cache` els comparteix dins d'una petició.
 */
export const getHolidays = cache(
  (): Promise<Holiday[]> =>
    db.schoolHoliday.findMany({
      select: { id: true, name: true, startDate: true, endDate: true },
      orderBy: { startDate: "asc" },
    }),
);

/** El festiu d'avui, a Espanya, si ho és. */
export async function holidayToday(now: Date = new Date()) {
  return holidayOn(madridDateKey(now), await getHolidays());
}
